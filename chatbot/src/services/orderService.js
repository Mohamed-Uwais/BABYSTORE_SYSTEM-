const db = require('../config/db');
const logger = require('../utils/logger');

async function createOrder({ channel, customerId, items, paymentMethod, deliveryAddress, deliveryZoneId, deliveryFee, notes }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const [variants] = await conn.query(
        `SELECT pv.id, pv.retail_price, pv.cost_price, pv.current_stock, pv.discount_type, pv.discount_value
         FROM product_variants pv WHERE pv.id = ? AND pv.is_active = TRUE`,
        [item.variant_id]
      );
      if (variants.length === 0) throw new Error(`Variant ${item.variant_id} not found`);
      const v = variants[0];
      if (v.current_stock < item.quantity) throw new Error(`Insufficient stock for variant ${item.variant_id}`);

      let unitPrice = v.retail_price;
      let discountAmount = 0;

      const [tiers] = await conn.query(
        'SELECT tier_price FROM variant_price_tiers WHERE variant_id = ? AND min_quantity <= ? ORDER BY min_quantity DESC LIMIT 1',
        [item.variant_id, item.quantity]
      );
      if (tiers.length > 0) {
        const tierTotal = Number(tiers[0].tier_price);
        unitPrice = Math.round(tierTotal / item.quantity);
        discountAmount = 0;
      } else if (v.discount_type === 'percent' && v.discount_value > 0) {
        discountAmount = Math.round(unitPrice * v.discount_value / 100);
      } else if (v.discount_type === 'amount' && v.discount_value > 0) {
        discountAmount = v.discount_value;
      }
      const lineTotal = tiers.length > 0 ? Number(tiers[0].tier_price) : (unitPrice - discountAmount) * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        variant_id: v.id,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_amount: discountAmount,
        line_total: lineTotal,
        cost_price_snapshot: v.cost_price,
      });
    }

    const grandTotal = subtotal + (deliveryFee || 0);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM orders WHERE DATE(created_at) = CURDATE()`);
    const seq = String((countRows[0].cnt || 0) + 1).padStart(3, '0');
    const orderNumber = `ORD-${dateStr}-${seq}`;

    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, channel, customer_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, delivery_address, delivery_zone_id, notes)
       VALUES (?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?, ?, ?)`,
      [orderNumber, channel, customerId, subtotal, deliveryFee || 0, grandTotal, deliveryAddress ? 'courier_delivery' : 'pickup', deliveryAddress || null, deliveryZoneId || null, notes || null]
    );
    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total, cost_price_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.variant_id, item.quantity, item.unit_price, item.discount_amount, item.line_total, item.cost_price_snapshot]
      );
      await conn.query(`UPDATE product_variants SET current_stock = current_stock - ? WHERE id = ?`, [item.quantity, item.variant_id]);
      await conn.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id) VALUES (?, ?, 'sale', 'order', ?)`,
        [item.variant_id, -item.quantity, orderId]
      );
    }

    await conn.query(
      `INSERT INTO order_payments (order_id, payment_method, amount) VALUES (?, ?, ?)`,
      [orderId, paymentMethod || 'cod', grandTotal]
    );

    if (deliveryAddress) {
      await conn.query(
        `INSERT INTO order_deliveries (order_id, receiver_address) VALUES (?, ?)`,
        [orderId, deliveryAddress]
      );
    }

    await conn.query(
      `INSERT INTO order_status_history (order_id, status, notes) VALUES (?, 'pending', ?)`,
      [orderId, `Created via ${channel} chatbot`]
    );

    await conn.commit();
    logger.info(`Order created: ${orderNumber} via ${channel}, total ${grandTotal}`);
    return { orderId, orderNumber, grandTotal };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getOrderStatus(orderNumber) {
  const [rows] = await db.query(
    `SELECT o.order_number, o.status, o.grand_total, o.created_at, o.delivery_address,
       od.delivery_status, od.tracking_number
     FROM orders o
     LEFT JOIN order_deliveries od ON od.order_id = o.id
     WHERE o.order_number = ?`,
    [orderNumber]
  );
  return rows[0] || null;
}

async function cancelOrder(orderNumber) {
  const [rows] = await db.query(`SELECT id, status FROM orders WHERE order_number = ?`, [orderNumber]);
  if (rows.length === 0) return { success: false, message: 'Order not found' };
  const order = rows[0];
  if (['shipped', 'delivered', 'completed', 'cancelled'].includes(order.status)) {
    return { success: false, message: `Order is already ${order.status} and cannot be cancelled` };
  }
  await db.query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [order.id]);
  const [items] = await db.query(`SELECT variant_id, quantity FROM order_items WHERE order_id = ?`, [order.id]);
  for (const item of items) {
    await db.query(`UPDATE product_variants SET current_stock = current_stock + ? WHERE id = ?`, [item.quantity, item.variant_id]);
  }
  return { success: true, message: 'Order cancelled successfully' };
}

module.exports = { createOrder, getOrderStatus, cancelOrder };
