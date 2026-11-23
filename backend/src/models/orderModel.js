const fifo = require('../utils/fifo');
const {paidLines,linkedRefund,cents} = require('../utils/returnValue');
const allocateTender = require('../utils/allocateTender');
const applyPromotions = require('../utils/applyPromotions');
const db = require('../config/db');
const customerModel = require('./customerModel');
const { claimRequest, requestHash } = require('../utils/checkoutRequest');
const { normalizeOrder } = require('../utils/validateOrder');

// Generates order numbers like ORD-2026-000123
async function generateOrderNumber(connection) {
  const year = new Date().getFullYear();
const [[row]] = await connection.query(
  `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 10) AS UNSIGNED)), 0) AS maxNum
   FROM orders WHERE order_number LIKE ? AND LENGTH(order_number) = 15`,
  [`ORD-${year}-%`]
);
const next = String(Number(row.maxNum) + 1).padStart(6, '0');
  return `ORD-${year}-${next}`;
}

/**
 * Creates a full order as ONE atomic transaction:
 *  - validates stock availability
 *  - inserts order + order_items
 *  - deducts stock (product_variants.current_stock) and logs stock_movements
 *  - inserts order_payments (supports split payments)
 *  - 'store_credit' = customer spends money we hold (negative credit_balance → closer to 0)
 *  - 'pay_later' = customer owes us (increases credit_balance), loyalty only
 *  - awards loyalty points (1 point per 100 LKR spent, tunable) for loyalty customers
 *  - inserts order_deliveries if fulfillment_type is courier_delivery or self_delivery
 *
 * payload shape:
 * {
 *   channel, customer_id, cashier_id,
 *   items: [{ variant_id, quantity, unit_price, discount_amount }],
 *   payments: [{ payment_method, amount, reference_note }],
 *   fulfillment_type, delivery_address, delivery_zone_id,
 *   delivery: { courier_id, tracking_number, receiver_name, receiver_phone, receiver_address } // optional
 *   discount_total, delivery_fee, notes
 * }
 */
async function createOrder(payload, transactionConnection = null) {
  payload = normalizeOrder(payload);
  const connection = transactionConnection || await db.getConnection();
  let numberLock = false;
  try {
    // Serializes number allocation across workers without changing order numbers.
    if (!transactionConnection) {
      const [[lock]] = await connection.query("SELECT GET_LOCK('littora:order-number', 10) AS acquired");
      if (Number(lock.acquired) !== 1) throw Object.assign(new Error('Checkout is busy. Please retry.'), { status: 503 });
      numberLock = true;
      await connection.beginTransaction();
    }
    const replay = await claimRequest(connection, payload.request_key, payload.request_hash || requestHash(payload));
    if (replay) {
      if (!transactionConnection) await connection.commit();
      return replay;
    }

    const {
      channel, customer_id, cashier_id, items, payments,
      fulfillment_type, delivery_address, delivery_zone_id, delivery,
      discount_total = 0, delivery_fee = 0, notes
    } = payload;

    if (!items || !Array.isArray(items) || !items.length) {
      throw new Error('Order must contain at least one item');
    }

    if (!payments || !Array.isArray(payments) || !payments.length) {
      throw new Error('At least one payment method is required');
    }

    const externalCOD = channel==='pos' && fulfillment_type==='courier_delivery';
    if(externalCOD && (!customer_id || !delivery?.courier_id || !delivery?.tracking_number?.trim())) {
      throw Error('Save a customer and tracking number before finalising an external courier bill');
    }
    if(externalCOD && (payments.length!==1 || payments[0].payment_method!=='cod'))throw Error('External courier bills require courier COD');
    const initialStatus=channel!=='pos'?'pending':(fulfillment_type && fulfillment_type!=='pickup'?'confirmed':'completed');

    // --- 1. Validate customer for store_credit / pay_later payments ---
    const usesStoreCredit = payments.some(p => p.payment_method === 'store_credit');
    const usesPayLater = payments.some(p => p.payment_method === 'pay_later');
    if (usesStoreCredit) {
      if (!customer_id) throw new Error('Store credit payment requires a registered customer');
      const [[customer]] = await connection.query(
        'SELECT credit_balance FROM customers WHERE id = ? FOR UPDATE', [customer_id]
      );
      if (!customer) throw new Error('Customer not found');
      const balance = Number(customer.credit_balance);
      if (balance >= 0) throw new Error('Customer has no store credit available');
      const creditAmt = payments.filter(p => p.payment_method === 'store_credit').reduce((s, p) => s + parseFloat(p.amount), 0);
      const available = Math.abs(balance);
      if (creditAmt > available + 0.5) {
        throw new Error(`Store credit insufficient: available Rs. ${available.toFixed(2)}, requested Rs. ${creditAmt.toFixed(2)}`);
      }
    }
    if (usesPayLater) {
      if (!customer_id) throw new Error('Pay later requires a registered customer');
      const [[customer]] = await connection.query(
        'SELECT customer_type, credit_balance, credit_limit FROM customers WHERE id = ? FOR UPDATE', [customer_id]
      );
      if (!customer || customer.customer_type !== 'loyalty') {
        throw new Error('Only loyalty customers can buy on credit');
      }
      const creditAmt = payments.filter(p => p.payment_method === 'pay_later').reduce((s, p) => s + parseFloat(p.amount), 0);
      if (customer.credit_limit && customer.credit_limit > 0) {
        const newBalance = Number(customer.credit_balance) + creditAmt;
        if (newBalance > Number(customer.credit_limit) + 0.5) {
          throw new Error(`Credit limit exceeded: limit Rs. ${Number(customer.credit_limit).toFixed(2)}, would owe Rs. ${newBalance.toFixed(2)}`);
        }
      }
    }

    // --- 2. Validate stock availability for every item BEFORE touching anything ---
    const quantities = new Map();
    for (const item of items) quantities.set(item.variant_id, (quantities.get(item.variant_id) || 0) + item.quantity);
    for (const item of [...items].sort((a, b) => a.variant_id - b.variant_id)) {
      const [[variant]] = await connection.query(
        (payload.coupon_code || channel==='pos') ? 'SELECT v.current_stock,v.retail_price,v.cost_price,v.product_id,p.category_id,p.brand_id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id = ? FOR UPDATE' : 'SELECT current_stock, retail_price, cost_price FROM product_variants WHERE id = ? FOR UPDATE',
        [item.variant_id]
      );
      if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
      if (variant.current_stock < quantities.get(item.variant_id)) {
        throw new Error(`Insufficient stock for variant ${item.variant_id}: have ${variant.current_stock}, need ${item.quantity}`);
      }
      if (payload.enforce_catalog_price && Number(item.unit_price) !== Number(variant.retail_price)) {
        const [[tier]] = await connection.query(
          'SELECT tier_price,min_quantity FROM variant_price_tiers WHERE variant_id=? AND min_quantity<=? ORDER BY min_quantity DESC LIMIT 1',
          [item.variant_id,item.quantity]);
        const expected = tier && Number(tier.tier_price)/Number(tier.min_quantity);
        if (!tier || Math.abs(expected-Number(item.unit_price))>0.00001) throw Error('Price override requires permission');
      }
      Object.assign(item, { product_id: variant.product_id, category_id: variant.category_id, brand_id: variant.brand_id });
      item._cost_price = null;
    }

    // --- 3. Calculate totals ---
    const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity) - (i.discount_amount || 0), 0);
    const redeemed=Number(payload.redeem_points||0);
    if(redeemed){
      if(channel!=='pos'||!customer_id||payload.wholesale||!Number.isSafeInteger(redeemed)||redeemed<1000||redeemed>10000||redeemed>subtotal-discount_total)throw Error('Invalid loyalty redemption');
      const [[holder]]=await connection.query('SELECT loyalty_points_balance FROM customers WHERE id=? FOR UPDATE',[customer_id]);
      if(!holder||redeemed>Number(holder.loyalty_points_balance))throw Error('Insufficient points');
    }
    const grand_total = subtotal - discount_total - redeemed + delivery_fee;

    const retainedPayments = allocateTender(payments, grand_total - (transactionConnection ? payload.applied_return_credit||0 : 0));
    let coupon = null;
    let snapshots = null;
    if (channel==='pos'||payload.promotion_result) {
      const result = channel==='pos' ? await applyPromotions(items,payload.coupon_code) : payload.promotion_result;
      if(result.couponError || cents(discount_total)<cents(result.totalDiscount)) throw Error('Discount changed. Review the bill before payment.');
      coupon=result.appliedPromotions.find(p=>p.promo_type==='coupon_code');
      const manual=cents(discount_total)-cents(result.totalDiscount);
      const lines=items.map((item,index)=>({id:index,line_total:(cents(item.unit_price*item.quantity)-cents(item.discount_amount||0)-result.allocations[index].promotion-result.allocations[index].coupon)/100}));
      if(manual>lines.reduce((sum,line)=>sum+cents(line.line_total),0))throw Error('Discount exceeds merchandise value');
      const paid=paidLines(lines,manual/100);
      const postLoyalty=paidLines(lines.map(line=>({id:line.id,line_total:paid.get(line.id)/100})),redeemed);
      snapshots=lines.map((line,index)=>({...result.allocations[index],manual:cents(items[index].discount_amount||0)+cents(line.line_total)-paid.get(index),loyalty:paid.get(index)-postLoyalty.get(index),paid:postLoyalty.get(index)}));
    }

    // --- 4. Insert order ---
    const order_number = await generateOrderNumber(connection);
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_number, channel, customer_id, cashier_id, status, subtotal, discount_total,
         delivery_fee, grand_total, fulfillment_type, delivery_address, delivery_zone_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_number, channel, customer_id || null, cashier_id || null,
       initialStatus, subtotal, discount_total,
       delivery_fee, grand_total, fulfillment_type || 'pickup', delivery_address || null,
       delivery_zone_id || null, notes || null]
    );
    const orderId = orderResult.insertId;

    if (coupon) await connection.query('UPDATE orders SET receipt_coupon_code=?,receipt_coupon_amount=? WHERE id=?',[coupon.coupon_code,coupon.discount,orderId]);

    // --- 5. Insert order_items; deduct stock only for POS (website/chatbot wait for acceptance) ---
    const isPOS = channel === 'pos';
    for (const [index,item] of items.entries()) {
      const line_total = (item.unit_price * item.quantity) - (item.discount_amount || 0);

      const [insertedItem] = await connection.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total, cost_price_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.variant_id, item.quantity, item.unit_price, item.discount_amount || 0, line_total, item._cost_price]
      );

      if(snapshots) await connection.query('UPDATE order_items SET refund_paid_amount=?,discount_allocation=? WHERE id=?',[snapshots[index].paid/100,JSON.stringify(snapshots[index]),insertedItem.insertId]);
      if (isPOS) {
        await fifo.consume(connection,insertedItem.insertId,item.variant_id,item.quantity);
        await connection.query(
          'UPDATE product_variants SET current_stock = current_stock - ? WHERE id = ?',
          [item.quantity, item.variant_id]
        );
        await connection.query(
          `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
           VALUES (?, ?, 'sale', 'order', ?, ?)`,
          [item.variant_id, -item.quantity, orderId, cashier_id || null]
        );
      }
    }

    // --- 6. Insert payments ---
    for (const p of retainedPayments) {
      await connection.query(
        `INSERT INTO order_payments (order_id, payment_method, amount, reference_note, cash_tendered)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, p.payment_method, p.amount, p.reference_note || null, p.cash_tendered]
      );
    }

    // --- 7. Loyalty points + credit ledger (only for POS orders with registered customers) ---
    if (customer_id && isPOS) {
      if(redeemed)await customerModel.addLedgerEntry(connection,{customer_id,entry_type:'points_redeemed',points_delta:-redeemed,reference_type:'order',reference_id:orderId,created_by:cashier_id,notes:'Bill redemption'});
      const pointsEarned = payload.wholesale ? 0 : Math.floor((cents(grand_total)-cents(delivery_fee)-cents(payload.applied_return_credit||0))/15000);

      if (pointsEarned > 0) {
        await customerModel.addLedgerEntry(connection, {
          customer_id, entry_type: 'points_earned', points_delta: pointsEarned,
          reference_type: 'order', reference_id: orderId,
          notes: `Points earned from order ${order_number}`, created_by: cashier_id
        });
      }

      const storeCreditPay = payments.find(p => p.payment_method === 'store_credit');
      if (storeCreditPay) {
        const redeemAmt = parseFloat(storeCreditPay.amount);
        await customerModel.addLedgerEntry(connection, {
          customer_id, entry_type: 'credit_repaid', credit_delta: redeemAmt,
          reference_type: 'order', reference_id: orderId,
          notes: `Store credit redeemed — order ${order_number}`,
          created_by: cashier_id
        });
      }

      const payLaterPay = payments.find(p => p.payment_method === 'pay_later');
      if (payLaterPay) {
        const creditAmount = fulfillment_type === 'courier_delivery'
          ? (subtotal - discount_total)
          : parseFloat(payLaterPay.amount);
        await customerModel.addLedgerEntry(connection, {
          customer_id, entry_type: 'credit_issued', credit_delta: creditAmount,
          reference_type: 'order', reference_id: orderId,
          notes: `Bought on credit — order ${order_number}${fulfillment_type === 'courier_delivery' ? ' (excl. delivery fee)' : ''}`,
          created_by: cashier_id
        });
      }
    }

    // --- 8. Delivery record (if applicable) ---
    let courierCode = null;
    if (fulfillment_type === 'courier_delivery' && delivery) {
      await connection.query(
        `INSERT INTO order_deliveries
          (order_id, courier_id, tracking_number, receiver_name, receiver_phone, receiver_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, delivery.courier_id, delivery.tracking_number || null,
         delivery.receiver_name || null, delivery.receiver_phone || null, delivery.receiver_address || null]
      );
      if (delivery.courier_id) {
        const [[courier]] = await connection.query('SELECT code, name FROM couriers WHERE id = ?', [delivery.courier_id]);
        courierCode = courier?.code;
      }
    } else if (fulfillment_type === 'self_delivery' && delivery) {
      await connection.query(
        `INSERT INTO order_deliveries (order_id, receiver_name, receiver_phone, receiver_address)
         VALUES (?, ?, ?, ?)`,
        [orderId, delivery.receiver_name || null, delivery.receiver_phone || null, delivery.receiver_address || null]
      );
    }

    // --- 8b. Courier credit: Koombiyo/Fardar collect COD, so they owe us the product value ---
    const isCourierCOD = externalCOD && courierCode;
    if (isCourierCOD) {
      const courierNames = { koombiyo: 'Koombiyo Delivery', fardar: 'Fardar Express' };
      const cName = courierNames[courierCode] || courierCode;
      const cPhone = courierCode.toUpperCase();

      const [[existingCourier]] = await connection.query(
        'SELECT id FROM customers WHERE phone = ?', [cPhone]
      );
      let courierCustomerId;
      if (existingCourier) {
        courierCustomerId = existingCourier.id;
      } else {
        const [ins] = await connection.query(
          `INSERT INTO customers (full_name, phone, customer_type, loyalty_tier) VALUES (?, ?, 'courier', 'none')`,
          [cName, cPhone]
        );
        courierCustomerId = ins.insertId;
      }

      const productValue = Math.max(0,grand_total-delivery_fee-(payload.applied_return_credit||0));
      if (productValue > 0) {
        await customerModel.addLedgerEntry(connection, {
          customer_id: courierCustomerId,
          entry_type: 'credit_issued',
          credit_delta: productValue,
          reference_type: 'order',
          reference_id: orderId,
          notes: `COD collection — order ${order_number} (product value only, excl. delivery fee Rs. ${delivery_fee})`,
          created_by: cashier_id,
        });
      }
    }

    // --- 9. Log initial status in history ---
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)',
      [orderId, initialStatus, cashier_id || null, 'Order created']
    );

    if (payload.payment_slip_url) {
      await connection.query('UPDATE orders SET payment_slip_url = ? WHERE id = ?', [payload.payment_slip_url, orderId]);
    }
    if (payload.request_key) {
      await connection.query('UPDATE checkout_requests SET order_id = ? WHERE request_key = ?', [orderId, payload.request_key]);
    }
    if (!transactionConnection) await connection.commit();
    return { orderId, order_number, grand_total };

  } catch (error) {
    try { if (!transactionConnection) await connection.rollback(); } catch { /* preserve the original failure */ }
    if (!error.code && !error.status) error.status = 400;
    throw error;
  } finally {
    if (numberLock) {
      try { await connection.query("SELECT RELEASE_LOCK('littora:order-number')"); }
      catch { connection.destroy(); }
    }
    if (!transactionConnection) connection.release();
  }
}

async function getOrderById(id) {
  const [[order]] = await db.query(
    `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
            c.credit_balance AS customer_credit_balance,
            u.full_name AS cashier_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.cashier_id
     WHERE o.id = ?`, [id]
  );
  if (!order) return null;

  const [items] = await db.query(
    `SELECT oi.*, pv.sku, pv.variant_label, p.name AS product_name
     FROM order_items oi
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE oi.order_id = ?`, [id]
  );
  const [payments] = await db.query('SELECT * FROM order_payments WHERE order_id = ?', [id]);
  const [delivery] = await db.query('SELECT * FROM order_deliveries WHERE order_id = ?', [id]);
  const [returns] = await db.query(
    `SELECT r.*, pv.sku, pv.variant_label, p.name AS product_name, u.full_name AS processed_by_name
     FROM order_returns r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN users u ON u.id = r.processed_by
     WHERE r.order_id = ?`, [id]
  );


  for(const item of items){
    const refunded = returns.filter(r=>r.order_item_id===item.id).reduce((sum,r)=>sum+cents(r.refund_amount),0);
    item.remaining_refund_cents = item.refund_paid_amount==null && Number(order.discount_total)>0 ? null : Math.max(0,cents(item.refund_paid_amount ?? item.line_total)-refunded);
  }
  const [credits]=await db.query('SELECT original_order_id,replacement_order_id,approved_amount,applied_amount,residual_amount,residual_method FROM return_transactions WHERE original_order_id=? OR replacement_order_id=?',[id,id]);
  return { ...order, credits, items, payments, delivery: delivery[0] || null, returns };
}

async function getAllOrders({ channel, status, limit = 50 } = {}) {
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (channel) { query += ' AND channel = ?'; params.push(channel); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Math.max(1, Math.min(1000, Number.parseInt(limit, 10) || 50)));
  const [rows] = await db.query(query, params);
  return rows;
}

// Best-sellers for the POS billing screen quick-select tiles: last 7 days
async function getBestSellers(limit = 12) {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.barcode, pv.variant_label, pv.retail_price, pv.wholesale_price, pv.current_stock,
           p.name AS product_name, pv.image_url, SUM(oi.quantity) AS units_sold
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND o.status IN ('completed', 'delivered')
    GROUP BY pv.id
    ORDER BY units_sold DESC
    LIMIT ?
  `, [limit]);
  return rows;
}

async function reconcileReturnPoints(connection,order,staff) {
  if(!order.customer_id)return;
  const [lines]=await connection.query(`SELECT i.quantity,i.refund_paid_amount,i.discount_allocation,
      (SELECT COALESCE(SUM(r.quantity),0) FROM order_returns r WHERE r.order_item_id=i.id) AS returned,
      (SELECT COALESCE(SUM(r.refund_amount),0) FROM order_returns r WHERE r.order_item_id=i.id) AS refunded
    FROM order_items i WHERE i.order_id=?`,[order.id]);
  const paid=lines.reduce((n,l)=>n+cents(l.refund_paid_amount||0),0);
  const refunded=lines.reduce((n,l)=>n+cents(l.refunded),0);
  const restore=Math.floor(lines.reduce((n,l)=>n+Math.round((l.discount_allocation?.loyalty||0)*l.returned/l.quantity),0)/100);
  const [[ledger]]=await connection.query(`SELECT
    COALESCE(SUM(CASE WHEN reference_type='order' AND points_delta>0 THEN points_delta ELSE 0 END),0) AS earned,
    COALESCE(SUM(CASE WHEN reference_type='refund' AND points_delta<0 THEN -points_delta ELSE 0 END),0) AS reversed,
    COALESCE(SUM(CASE WHEN reference_type='refund' AND points_delta>0 THEN points_delta ELSE 0 END),0) AS restored
    FROM customer_ledger WHERE reference_id=? AND customer_id=?`,[order.id,order.customer_id]);
  const remove=paid ? Math.max(0,Math.floor(Number(ledger.earned)*Math.min(refunded,paid)/paid)-Number(ledger.reversed)):0;
  for(const delta of [-remove,Math.max(0,restore-Number(ledger.restored))]){
    if(delta)await customerModel.addLedgerEntry(connection,{customer_id:order.customer_id,entry_type:delta>0?'points_earned':'points_redeemed',points_delta:delta,reference_type:'refund',reference_id:order.id,created_by:staff,notes:'Original bill points reconciliation'});
  }
}

async function remainingRefund(connection, order, item, returned, refundedValue, qty) {
  if(Number(order.discount_total)>0 && item.refund_paid_amount==null) throw Error('Missing original discount allocation. An owner must resolve the bill before a refund.');
  const paid = cents(item.refund_paid_amount ?? item.line_total);
  return linkedRefund(paid-cents(refundedValue||0),Number(item.quantity)-Number(returned),Number(qty));
}

async function processRefund(orderId, refundData, processedBy) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { order_item_id, quantity, reason, restock } = refundData;

    const [[order]] = await connection.query('SELECT id, status, customer_id, grand_total, discount_total FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw new Error('Order not found');
    const key=refundData.submission_key,hash=requestHash({orderId,refundData});
    if(key){
      await connection.query('INSERT INTO return_transactions(submission_key,payload_hash,original_order_id,processed_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE submission_key=submission_key',[key,hash,orderId,processedBy]);
      const [[prior]]=await connection.query('SELECT result,payload_hash FROM return_transactions WHERE submission_key=? FOR UPDATE',[key]);
      if(prior.payload_hash!==hash)throw Error('Refund request changed on retry');
      if(prior.result){await connection.commit();return prior.result}
    }
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new Error(`Cannot refund an order with status "${order.status}"`);
    }

    const [[item]] = await connection.query(
      'SELECT oi.*, pv.variant_label, p.name AS product_name FROM order_items oi JOIN product_variants pv ON pv.id = oi.variant_id JOIN products p ON p.id = pv.product_id WHERE oi.id = ? AND oi.order_id = ?',
      [order_item_id, orderId]
    );
    if (!item) throw new Error('Order item not found');

    const [[{ already_returned, refunded_value }]] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS already_returned, COALESCE(SUM(refund_amount),0) AS refunded_value FROM order_returns WHERE order_item_id = ?',
      [order_item_id]
    );
    const maxReturnable = item.quantity - already_returned;
    if (quantity > maxReturnable) {
      throw new Error(`Can only return ${maxReturnable} more of this item (${already_returned} already returned)`);
    }
    const refund_amount = await remainingRefund(connection,order,item,already_returned,refunded_value,quantity);
    if(refundData.refund_amount != null && cents(refundData.refund_amount)!==cents(refund_amount)) throw Error('Refund value changed; reload the original bill');

    const [insertedReturn] = await connection.query(
      `INSERT INTO order_returns (order_id, order_item_id, quantity, reason, refund_amount, restock, processed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, order_item_id, quantity, reason || null, refund_amount, restock ? 1 : 0, processedBy]
    );

    await fifo.returnCost(connection,item,quantity,restock,insertedReturn.insertId);
    if (restock) {
      await connection.query(
        'UPDATE product_variants SET current_stock = current_stock + ? WHERE id = ?',
        [quantity, item.variant_id]
      );
      await connection.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, ?, 'refund', 'order', ?, ?)`,
        [item.variant_id, quantity, orderId, processedBy]
      );
    }

    const [[{ total_items_qty }]] = await connection.query(
      'SELECT SUM(quantity) AS total_items_qty FROM order_items WHERE order_id = ?', [orderId]
    );
    const [[{ total_returned_qty }]] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS total_returned_qty FROM order_returns WHERE order_id = ?', [orderId]
    );
    const newStatus = total_returned_qty >= total_items_qty ? 'refunded' : 'partially_refunded';
    await connection.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);

    await reconcileReturnPoints(connection,order,processedBy);
    const result={success:true,new_status:newStatus};
    if(key)await connection.query("UPDATE return_transactions SET approved_amount=?,applied_amount=0,residual_amount=?,residual_method='refund',result=? WHERE submission_key=?",[refund_amount,refund_amount,JSON.stringify(result),key]);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve the original failure */ }
    if (!error.code && !error.status) error.status = 400;
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderReturns(orderId) {
  const [rows] = await db.query(
    `SELECT r.*, oi.variant_id, pv.sku, pv.variant_label, p.name AS product_name, u.full_name AS processed_by_name
     FROM order_returns r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN users u ON u.id = r.processed_by
     WHERE r.order_id = ?
     ORDER BY r.created_at DESC`, [orderId]
  );
  return rows;
}

async function processReturnExchange(data, processedBy, transactionConnection = null) {
  const connection = transactionConnection || await db.getConnection();
  try {
    if (!transactionConnection) await connection.beginTransaction();

    const { original_order_id, return_items, refund_method, customer_id } = data;

    const [[order]] = await connection.query('SELECT id, status, customer_id, discount_total FROM orders WHERE id = ? FOR UPDATE', [original_order_id]);
    if (!order) throw new Error('Original order not found');
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new Error(`Cannot process returns on an order with status "${order.status}"`);
    }

    if (!Array.isArray(return_items) || !return_items.length) throw new Error('Return items are required');
    let totalRefundAmount = 0;

    for (const ri of return_items) {
      if (!ri || !Number.isSafeInteger(Number(ri.quantity)) || Number(ri.quantity) <= 0) throw new Error('Return quantity must be a positive integer');
      const [[item]] = await connection.query(
        'SELECT oi.*, pv.variant_label, p.name AS product_name FROM order_items oi JOIN product_variants pv ON pv.id = oi.variant_id JOIN products p ON p.id = pv.product_id WHERE oi.id = ? AND oi.order_id = ?',
        [ri.order_item_id, original_order_id]
      );
      if (!item) throw new Error(`Order item ${ri.order_item_id} not found`);

      const [[{ already_returned, refunded_value }]] = await connection.query(
        'SELECT COALESCE(SUM(quantity), 0) AS already_returned, COALESCE(SUM(refund_amount),0) AS refunded_value FROM order_returns WHERE order_item_id = ?',
        [ri.order_item_id]
      );
      const maxReturnable = item.quantity - already_returned;
      if (ri.quantity > maxReturnable) {
        throw new Error(`Can only return ${maxReturnable} more of ${item.product_name} ${item.variant_label}`);
      }

      const refundAmount = await remainingRefund(connection,order,item,already_returned,refunded_value,ri.quantity);
      totalRefundAmount += refundAmount;

      const [insertedReturn] = await connection.query(
        `INSERT INTO order_returns (order_id, order_item_id, quantity, reason, refund_amount, restock, processed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [original_order_id, ri.order_item_id, ri.quantity, ri.reason || 'Customer return', refundAmount, ri.restock===false?0:1,processedBy]
      );

      await fifo.returnCost(connection,item,ri.quantity,ri.restock!==false,insertedReturn.insertId);
      if(ri.restock===false)continue;
      await connection.query(
        'UPDATE product_variants SET current_stock = current_stock + ? WHERE id = ?',
        [ri.quantity, item.variant_id]
      );
      await connection.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, ?, 'refund', 'order', ?, ?)`,
        [item.variant_id, ri.quantity, original_order_id, processedBy]
      );
    }

    const [[{ total_items_qty }]] = await connection.query(
      'SELECT SUM(quantity) AS total_items_qty FROM order_items WHERE order_id = ?', [original_order_id]
    );
    const [[{ total_returned_qty }]] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS total_returned_qty FROM order_returns WHERE order_id = ?', [original_order_id]
    );
    const newStatus = total_returned_qty >= total_items_qty ? 'refunded' : 'partially_refunded';
    await connection.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, original_order_id]);

    const effectiveCustomerId = order.customer_id;

    if (refund_method === 'store_credit' && effectiveCustomerId) {
      await customerModel.addLedgerEntry(connection, {
        customer_id: effectiveCustomerId,
        entry_type: 'credit_repaid',
        credit_delta: -totalRefundAmount,
        reference_type: 'order',
        reference_id: original_order_id,
        notes: `Credit reduced from return on order #${original_order_id}`,
        created_by: processedBy,
      });
    }

    await reconcileReturnPoints(connection,order,processedBy);
    if (!transactionConnection) await connection.commit();
    return { success: true, refund_total: totalRefundAmount, refund_method, new_status: newStatus };
  } catch (error) {
    try { if (!transactionConnection) await connection.rollback(); } catch { /* preserve the original failure */ }
    if (!error.code && !error.status) error.status = 400;
    throw error;
  } finally {
    if (!transactionConnection) connection.release();
  }
}

// The return and replacement must either both commit or both roll back.
async function processExchange(data, processedBy) {
  if (!data.replacement && !data.submission_key) return processReturnExchange(data, processedBy);
  const connection = await db.getConnection();
  let numberLock = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('littora:order-number', 10) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Checkout is busy. Please retry.');
    numberLock = true;
    await connection.beginTransaction();
    const key=data.submission_key;
    if(key){
      const hash=requestHash(data);
      await connection.query('INSERT INTO return_transactions(submission_key,payload_hash,original_order_id,processed_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE submission_key=submission_key',[key,hash,data.original_order_id,processedBy]);
      const [[prior]]=await connection.query('SELECT payload_hash,result FROM return_transactions WHERE submission_key=? FOR UPDATE',[key]);
      if(prior.payload_hash!==hash)throw Error('Return request changed on retry');
      if(prior.result){await connection.commit();return prior.result}
    }
    const returned = await processReturnExchange({...data,refund_method:'none'}, processedBy, connection);
    const next=data.replacement;
    const due=next ? cents(next.items.reduce((sum,i)=>sum+i.unit_price*i.quantity-(i.discount_amount||0),0)-(next.discount_total||0)-(next.redeem_points||0)+(Number(next.delivery_fee)||0)) : 0;
    if(due<0)throw Error('Invalid replacement value');
    const applied= Math.min(cents(returned.refund_total),due)/100;
    const residual=(cents(returned.refund_total)-cents(applied))/100;
    const method=residual ? data.refund_method : 'none';
    if(residual && !['store_credit','cash'].includes(method))throw Error('Select a refund method for the unused return credit');
    if(method==='store_credit'){
      const [[original]]=await connection.query('SELECT customer_id FROM orders WHERE id=?',[data.original_order_id]);
      if(!original.customer_id)throw Error('Store credit requires the original customer');
      await customerModel.addLedgerEntry(connection,{customer_id:original.customer_id,entry_type:'credit_repaid',credit_delta:-residual,reference_type:'order',reference_id:data.original_order_id,created_by:processedBy,notes:'Unused return credit'});
    }
    const replacement=next ? await createOrder({...next,channel:'pos',cashier_id:processedBy,request_key:null,enforce_catalog_price:data.enforce_catalog_price,applied_return_credit:applied},connection) : null;
    const result={...returned,refund_method:method,applied_credit:applied,residual_amount:residual,replacement};
    if(key)await connection.query('UPDATE return_transactions SET replacement_order_id=?,approved_amount=?,applied_amount=?,residual_amount=?,residual_method=?,result=? WHERE submission_key=?',[replacement?.orderId||null,returned.refund_total,applied,residual,method,JSON.stringify(result),key]);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve original error */ }
    throw error;
  } finally {
    if (numberLock) {
      try { await connection.query("SELECT RELEASE_LOCK('littora:order-number')"); } catch { connection.destroy(); }
    }
    connection.release();
  }
}

async function searchOrderForReturn(query) {
  const q = `%${query}%`;
  const [orders] = await db.query(
    `SELECT o.id, o.order_number, o.created_at, o.grand_total, o.status,
            c.full_name AS customer_name, c.phone AS customer_phone
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE (o.order_number LIKE ? OR c.phone LIKE ?)
       AND o.status NOT IN ('cancelled', 'refunded')
     ORDER BY o.created_at DESC LIMIT 10`,
    [q, q]
  );
  return orders;
}

async function getOrderItemsForReturn(orderId) {
  const [items] = await db.query(
    `SELECT oi.id AS order_item_id, oi.variant_id, oi.quantity, oi.unit_price, oi.line_total, oi.refund_paid_amount,
            pv.variant_label, pv.sku, p.name AS product_name,
            COALESCE((SELECT SUM(r.quantity) FROM order_returns r WHERE r.order_item_id = oi.id), 0) AS already_returned,
            COALESCE((SELECT SUM(r.refund_amount) FROM order_returns r WHERE r.order_item_id=oi.id),0) AS refunded_value
     FROM order_items oi
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  const [[bill]]=await db.query('SELECT discount_total FROM orders WHERE id=?',[orderId]);

  return items.map(i => ({ ...i, returnable: i.quantity - i.already_returned,
    remaining_refund_cents: i.refund_paid_amount==null && Number(bill?.discount_total)>0 ? null : Math.max(0,cents(i.refund_paid_amount ?? i.line_total)-cents(i.refunded_value)) }));

}

async function acceptOrder(orderId, acceptedBy) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[order]] = await connection.query(
      'SELECT id, status, order_number, customer_id, grand_total, delivery_fee FROM orders WHERE id = ? FOR UPDATE', [orderId]
    );
    if (!order) throw new Error('Order not found');
    if (order.status === 'confirmed') { await connection.commit(); return { success: true }; }
    if (order.status !== 'pending') throw new Error(`Cannot accept order with status "${order.status}"`);

    const [items] = await connection.query(
      'SELECT variant_id, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY variant_id ORDER BY variant_id', [orderId]
    );

    for (const item of items) {
      // Legacy chatbot orders already deducted stock at creation.
      const [[movement]] = await connection.query(
        "SELECT COALESCE(-SUM(change_qty), 0) AS deducted FROM stock_movements WHERE reference_type = 'order' AND reference_id = ? AND variant_id = ? AND reason = 'sale'", [orderId, item.variant_id]
      );
      item.quantity = Number(item.quantity) - Number(movement.deducted);
      if (item.quantity < 0) throw new Error('Order stock history needs review before acceptance');
      if (item.quantity === 0) continue;
      const [[variant]] = await connection.query(
        'SELECT current_stock FROM product_variants WHERE id = ? FOR UPDATE', [item.variant_id]
      );
      if (!variant || variant.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.variant_id}: have ${variant?.current_stock || 0}, need ${item.quantity}`);
      }
      if(Number(movement.deducted)!==0)throw Error('Partial legacy deduction requires stock reconciliation');
      const [lines]=await connection.query('SELECT id,quantity FROM order_items WHERE order_id=? AND variant_id=? ORDER BY id',[orderId,item.variant_id]);
      for (const line of lines) {
        await fifo.consume(connection,line.id,item.variant_id,line.quantity);
        await connection.query('UPDATE product_variants SET current_stock = current_stock - ? WHERE id = ?', [line.quantity,item.variant_id]);
      }
      await connection.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, ?, 'sale', 'order', ?, ?)`,
        [item.variant_id, -item.quantity, orderId, acceptedBy || null]
      );
    }

    await connection.query('UPDATE orders SET status = ? WHERE id = ?', ['confirmed', orderId]);
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)',
      [orderId, 'confirmed', acceptedBy || null, 'Order accepted']
    );

    if (order.customer_id) {
      const pointsEarned = Math.floor((cents(order.grand_total)-cents(order.delivery_fee||0))/15000);
      if (pointsEarned > 0) {
        await customerModel.addLedgerEntry(connection, {
          customer_id: order.customer_id, entry_type: 'points_earned', points_delta: pointsEarned,
          reference_type: 'order', reference_id: orderId,
          notes: `Points earned from order ${order.order_number}`, created_by: acceptedBy
        });
      }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve the original failure */ }
    if (!error.code && !error.status) error.status = 400;
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectOrder(orderId, rejectedBy, rejectionReason) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw new Error('Order not found');
    if (order.status === 'cancelled') { await connection.commit(); return { success: true }; }
    if (order.status !== 'pending') throw new Error(`Cannot reject order with status "${order.status}"`);
    const [movements] = await connection.query(
      "SELECT variant_id, -SUM(change_qty) AS quantity FROM stock_movements WHERE reference_type = 'order' AND reference_id = ? AND reason = 'sale' GROUP BY variant_id ORDER BY variant_id", [orderId]
    );
    for (const item of movements) {
      if (Number(item.quantity) <= 0) continue;
      await connection.query('UPDATE product_variants SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.variant_id]);
      await connection.query("INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by) VALUES (?, ?, 'refund', 'order', ?, ?)", [item.variant_id, item.quantity, orderId, rejectedBy || null]);
    }
    await connection.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId]);
    await connection.query('INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)', [orderId, 'cancelled', rejectedBy || null, `Rejected: ${rejectionReason || 'No reason given'}`]);
    await connection.commit();
    return { success: true };
  } catch (error) {
    try { await connection.rollback(); } catch { /* preserve the original failure */ }
    if (!error.code && !error.status) error.status = 400;
    throw error;
  } finally { connection.release(); }
}

async function getPendingOrders() {
  const [orders] = await db.query(`
    SELECT o.id, o.order_number, o.channel, o.status, o.subtotal, o.discount_total,
           o.delivery_fee, o.grand_total, o.fulfillment_type, o.delivery_address,
           o.created_at, o.notes,
           c.full_name AS customer_name, c.phone AS customer_phone
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.status = 'pending'
    ORDER BY o.created_at ASC
  `);
  for (const order of orders) {
    const [items] = await db.query(
      `SELECT oi.variant_id, oi.quantity, oi.unit_price, oi.line_total, oi.refund_paid_amount,
              pv.variant_label, pv.sku, pv.current_stock, p.name AS product_name
       FROM order_items oi
       JOIN product_variants pv ON pv.id = oi.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE oi.order_id = ?`, [order.id]
    );
    order.items = items;
    order.has_stock_issue = items.some(i => i.current_stock < i.quantity);
  }
  return orders;
}

module.exports = { processExchange, createOrder, getOrderById, getAllOrders, getBestSellers, processRefund, getOrderReturns, processReturnExchange, searchOrderForReturn, getOrderItemsForReturn, acceptOrder, rejectOrder, getPendingOrders };
