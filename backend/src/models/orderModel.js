const db = require('../config/db');
const customerModel = require('./customerModel');

// Generates order numbers like ORD-2026-000123
async function generateOrderNumber(connection) {
  const year = new Date().getFullYear();
  const [[{ count }]] = await connection.query(
    `SELECT COUNT(*) AS count FROM orders WHERE order_number LIKE ?`,
    [`ORD-${year}-%`]
  );
  const next = String(count + 1).padStart(6, '0');
  return `ORD-${year}-${next}`;
}

/**
 * Creates a full order as ONE atomic transaction:
 *  - validates stock availability
 *  - inserts order + order_items
 *  - deducts stock (product_variants.current_stock) and logs stock_movements
 *  - inserts order_payments (supports split payments)
 *  - if payment_method includes 'store_credit', ONLY allowed for loyalty customers,
 *    and it increases their credit_balance (they now owe the shop)
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
async function createOrder(payload) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      channel, customer_id, cashier_id, items, payments,
      fulfillment_type, delivery_address, delivery_zone_id, delivery,
      discount_total = 0, delivery_fee = 0, notes
    } = payload;

    if (!items || !items.length) {
      throw new Error('Order must contain at least one item');
    }

    // --- 1. Validate customer_type for credit payments ---
    const usesCredit = payments.some(p => p.payment_method === 'store_credit');
    if (usesCredit) {
      if (!customer_id) throw new Error('Credit payment requires a registered customer');
      const [[customer]] = await connection.query(
        'SELECT customer_type, credit_balance FROM customers WHERE id = ? FOR UPDATE', [customer_id]
      );
      if (!customer || customer.customer_type !== 'loyalty') {
        throw new Error('Only loyalty customers can use store credit / pay on credit');
      }
      const creditAmt = payments.filter(p => p.payment_method === 'store_credit').reduce((s, p) => s + parseFloat(p.amount), 0);
      if (creditAmt > customer.credit_balance + 0.5) {
        throw new Error(`Insufficient store credit: available Rs. ${customer.credit_balance.toFixed(2)}, requested Rs. ${creditAmt.toFixed(2)}`);
      }
    }

    // --- 2. Validate stock availability for every item BEFORE touching anything ---
    for (const item of items) {
      const [[variant]] = await connection.query(
        'SELECT current_stock, retail_price, cost_price FROM product_variants WHERE id = ? FOR UPDATE',
        [item.variant_id]
      );
      if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
      if (variant.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.variant_id}: have ${variant.current_stock}, need ${item.quantity}`);
      }
      item._cost_price = variant.cost_price || 0;
    }

    // --- 3. Calculate totals ---
    const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity) - (i.discount_amount || 0), 0);
    const grand_total = subtotal - discount_total + delivery_fee;

    const paymentsTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    if (Math.abs(paymentsTotal - grand_total) > 0.5) {
      // small tolerance for rounding; adjust if you need exact-cent matching
      throw new Error(`Payment total (${paymentsTotal}) does not match order total (${grand_total})`);
    }

    // --- 4. Insert order ---
    const order_number = await generateOrderNumber(connection);
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_number, channel, customer_id, cashier_id, status, subtotal, discount_total,
         delivery_fee, grand_total, fulfillment_type, delivery_address, delivery_zone_id, notes)
       VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_number, channel, customer_id || null, cashier_id || null, subtotal, discount_total,
       delivery_fee, grand_total, fulfillment_type || 'pickup', delivery_address || null,
       delivery_zone_id || null, notes || null]
    );
    const orderId = orderResult.insertId;

    // --- 5. Insert order_items, deduct stock, log stock_movements ---
    for (const item of items) {
      const line_total = (item.unit_price * item.quantity) - (item.discount_amount || 0);

      await connection.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total, cost_price_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.variant_id, item.quantity, item.unit_price, item.discount_amount || 0, line_total, item._cost_price]
      );

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

    // --- 6. Insert payments ---
    for (const p of payments) {
      await connection.query(
        `INSERT INTO order_payments (order_id, payment_method, amount, reference_note)
         VALUES (?, ?, ?, ?)`,
        [orderId, p.payment_method, p.amount, p.reference_note || null]
      );
    }

    // --- 7. Loyalty points + credit ledger (only for registered customers) ---
    if (customer_id) {
      const pointsEarned = Math.floor(grand_total / 100); // 1 point per 100 LKR - tune as needed

      if (pointsEarned > 0) {
        await customerModel.addLedgerEntry(connection, {
          customer_id, entry_type: 'points_earned', points_delta: pointsEarned,
          reference_type: 'order', reference_id: orderId,
          notes: `Points earned from order ${order_number}`, created_by: cashier_id
        });
      }

      const creditPayment = payments.find(p => p.payment_method === 'store_credit');
      if (creditPayment) {
        await customerModel.addLedgerEntry(connection, {
          customer_id, entry_type: 'credit_repaid', credit_delta: -parseFloat(creditPayment.amount),
          reference_type: 'order', reference_id: orderId,
          notes: `Store credit used for order ${order_number}`, created_by: cashier_id
        });
      }
    }

    // --- 8. Delivery record (if applicable) ---
    if (fulfillment_type === 'courier_delivery' && delivery) {
      await connection.query(
        `INSERT INTO order_deliveries
          (order_id, courier_id, tracking_number, receiver_name, receiver_phone, receiver_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, delivery.courier_id, delivery.tracking_number || null,
         delivery.receiver_name || null, delivery.receiver_phone || null, delivery.receiver_address || null]
      );
    } else if (fulfillment_type === 'self_delivery' && delivery) {
      await connection.query(
        `INSERT INTO order_deliveries (order_id, receiver_name, receiver_phone, receiver_address)
         VALUES (?, ?, ?, ?)`,
        [orderId, delivery.receiver_name || null, delivery.receiver_phone || null, delivery.receiver_address || null]
      );
    }

    // --- 9. Log initial status in history ---
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)',
      [orderId, 'completed', cashier_id || null, 'Order created']
    );

    await connection.commit();
    return { orderId, order_number, grand_total };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderById(id) {
  const [[order]] = await db.query(
    `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
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

  return { ...order, items, payments, delivery: delivery[0] || null, returns };
}

async function getAllOrders({ channel, status, limit = 50 } = {}) {
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (channel) { query += ' AND channel = ?'; params.push(channel); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  const [rows] = await db.query(query, params);
  return rows;
}

// Best-sellers for the POS billing screen quick-select tiles: last 7 days
async function getBestSellers(limit = 12) {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.retail_price, pv.current_stock,
           p.name AS product_name, pv.image_url, SUM(oi.quantity) AS units_sold
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND o.status = 'completed'
    GROUP BY pv.id
    ORDER BY units_sold DESC
    LIMIT ?
  `, [limit]);
  return rows;
}

async function processRefund(orderId, refundData, processedBy) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { order_item_id, quantity, reason, refund_amount, restock } = refundData;

    const [[order]] = await connection.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw new Error('Order not found');
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new Error(`Cannot refund an order with status "${order.status}"`);
    }

    const [[item]] = await connection.query(
      'SELECT oi.*, pv.variant_label, p.name AS product_name FROM order_items oi JOIN product_variants pv ON pv.id = oi.variant_id JOIN products p ON p.id = pv.product_id WHERE oi.id = ? AND oi.order_id = ?',
      [order_item_id, orderId]
    );
    if (!item) throw new Error('Order item not found');

    const [[{ already_returned }]] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS already_returned FROM order_returns WHERE order_item_id = ?',
      [order_item_id]
    );
    const maxReturnable = item.quantity - already_returned;
    if (quantity > maxReturnable) {
      throw new Error(`Can only return ${maxReturnable} more of this item (${already_returned} already returned)`);
    }
    if (refund_amount > item.line_total) {
      throw new Error(`Refund amount cannot exceed line total (${item.line_total})`);
    }

    await connection.query(
      `INSERT INTO order_returns (order_id, order_item_id, quantity, reason, refund_amount, restock, processed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, order_item_id, quantity, reason || null, refund_amount, restock ? 1 : 0, processedBy]
    );

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

    await connection.commit();
    return { success: true, new_status: newStatus };
  } catch (error) {
    await connection.rollback();
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

async function processReturnExchange(data, processedBy) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { original_order_id, return_items, refund_method, customer_id } = data;

    const [[order]] = await connection.query('SELECT id, status, customer_id FROM orders WHERE id = ? FOR UPDATE', [original_order_id]);
    if (!order) throw new Error('Original order not found');
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new Error(`Cannot process returns on an order with status "${order.status}"`);
    }

    let totalRefundAmount = 0;

    for (const ri of return_items) {
      const [[item]] = await connection.query(
        'SELECT oi.*, pv.variant_label, p.name AS product_name FROM order_items oi JOIN product_variants pv ON pv.id = oi.variant_id JOIN products p ON p.id = pv.product_id WHERE oi.id = ? AND oi.order_id = ?',
        [ri.order_item_id, original_order_id]
      );
      if (!item) throw new Error(`Order item ${ri.order_item_id} not found`);

      const [[{ already_returned }]] = await connection.query(
        'SELECT COALESCE(SUM(quantity), 0) AS already_returned FROM order_returns WHERE order_item_id = ?',
        [ri.order_item_id]
      );
      const maxReturnable = item.quantity - already_returned;
      if (ri.quantity > maxReturnable) {
        throw new Error(`Can only return ${maxReturnable} more of ${item.product_name} ${item.variant_label}`);
      }

      const perUnitPrice = item.line_total / item.quantity;
      const refundAmount = parseFloat((perUnitPrice * ri.quantity).toFixed(2));
      totalRefundAmount += refundAmount;

      await connection.query(
        `INSERT INTO order_returns (order_id, order_item_id, quantity, reason, refund_amount, restock, processed_by)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [original_order_id, ri.order_item_id, ri.quantity, ri.reason || 'Customer return', refundAmount, processedBy]
      );

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

    const effectiveCustomerId = customer_id || order.customer_id;

    if (refund_method === 'store_credit' && effectiveCustomerId) {
      await customerModel.addLedgerEntry(connection, {
        customer_id: effectiveCustomerId,
        entry_type: 'credit_issued',
        credit_delta: totalRefundAmount,
        reference_type: 'order',
        reference_id: original_order_id,
        notes: `Store credit from return on order #${original_order_id}`,
        created_by: processedBy,
      });
    }

    await connection.commit();
    return { success: true, refund_total: totalRefundAmount, refund_method, new_status: newStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
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
    `SELECT oi.id AS order_item_id, oi.variant_id, oi.quantity, oi.unit_price, oi.line_total,
            pv.variant_label, pv.sku, p.name AS product_name,
            COALESCE((SELECT SUM(r.quantity) FROM order_returns r WHERE r.order_item_id = oi.id), 0) AS already_returned
     FROM order_items oi
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  return items.map(i => ({ ...i, returnable: i.quantity - i.already_returned }));
}

module.exports = { createOrder, getOrderById, getAllOrders, getBestSellers, processRefund, getOrderReturns, processReturnExchange, searchOrderForReturn, getOrderItemsForReturn };
