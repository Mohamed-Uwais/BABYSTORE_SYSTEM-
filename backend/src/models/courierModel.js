const db = require('../config/db');

async function getCouriers() {
  const [rows] = await db.query('SELECT * FROM couriers WHERE is_active = TRUE ORDER BY name');
  return rows;
}

async function getCourierByCode(code) {
  const [[row]] = await db.query('SELECT * FROM couriers WHERE code = ?', [code]);
  return row;
}

async function assignDelivery(orderId, data) {
  const { courier_id, tracking_number, receiver_name, receiver_phone, receiver_address } = data;

  const [[existing]] = await db.query('SELECT id FROM order_deliveries WHERE order_id = ?', [orderId]);
  if (existing) {
    await db.query(
      `UPDATE order_deliveries SET courier_id = ?, tracking_number = ?, receiver_name = ?, receiver_phone = ?, receiver_address = ? WHERE order_id = ?`,
      [courier_id || null, tracking_number || null, receiver_name || null, receiver_phone || null, receiver_address || null, orderId]
    );
  } else {
    await db.query(
      `INSERT INTO order_deliveries (order_id, courier_id, tracking_number, receiver_name, receiver_phone, receiver_address) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, courier_id || null, tracking_number || null, receiver_name || null, receiver_phone || null, receiver_address || null]
    );
  }

  const [[row]] = await db.query(
    `SELECT od.*, c.code AS courier_code, c.name AS courier_name, c.tracking_url_template, c.has_api
     FROM order_deliveries od LEFT JOIN couriers c ON c.id = od.courier_id WHERE od.order_id = ?`,
    [orderId]
  );
  return row;
}

async function getDelivery(orderId) {
  const [[row]] = await db.query(
    `SELECT od.*, c.code AS courier_code, c.name AS courier_name, c.tracking_url_template, c.has_api
     FROM order_deliveries od LEFT JOIN couriers c ON c.id = od.courier_id WHERE od.order_id = ?`,
    [orderId]
  );
  return row || null;
}

async function getTracking(orderId) {
  const delivery = await getDelivery(orderId);
  if (!delivery) return null;

  if (!delivery.courier_code) {
    return { ...delivery, tracking_info: { status: 'Self-delivery', message: 'No courier assigned' } };
  }

  let trackingInfo;
  if (delivery.courier_code === 'koombiyo') {
    const koombiyo = require('../couriers/koombiyo');
    trackingInfo = await koombiyo.getTracking(delivery.tracking_number);
  } else if (delivery.courier_code === 'fardar') {
    const fardar = require('../couriers/fardar');
    trackingInfo = await fardar.getTracking(delivery.tracking_number, delivery.tracking_url_template);
  } else {
    trackingInfo = { status: 'Unknown courier', tracking_number: delivery.tracking_number };
  }

  return { ...delivery, tracking_info: trackingInfo };
}

async function getDeliveryOrders({ status, method, tab = 'active' } = {}) {
  let where = "o.fulfillment_type IN ('self_delivery','courier_delivery')";
  if (tab === 'active') {
    where += " AND o.status NOT IN ('delivered','cancelled','refunded')";
  } else {
    where += " AND o.status = 'delivered'";
  }
  if (status) where += ` AND o.status = ${db.escape(status)}`;
  if (method === 'our_delivery') where += " AND o.fulfillment_type = 'self_delivery'";
  else if (method) where += ` AND c.code = ${db.escape(method)}`;

  const [rows] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.status, o.grand_total, o.delivery_fee,
           o.fulfillment_type, o.delivery_address, o.customer_id,
           cust.full_name AS customer_name, cust.phone AS customer_phone,
           od.tracking_number, od.receiver_name, od.receiver_phone, od.receiver_address,
           od.courier_id, c.code AS courier_code, c.name AS courier_name, c.tracking_url_template
    FROM orders o
    LEFT JOIN customers cust ON cust.id = o.customer_id
    LEFT JOIN order_deliveries od ON od.order_id = o.id
    LEFT JOIN couriers c ON c.id = od.courier_id
    WHERE ${where}
    ORDER BY o.created_at DESC
    LIMIT 200
  `);

  for (const row of rows) {
    const [items] = await db.query(
      `SELECT p.name AS product_name, pv.variant_label, oi.quantity
       FROM order_items oi
       JOIN product_variants pv ON pv.id = oi.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE oi.order_id = ?`, [row.id]
    );
    row.items = items;
  }
  return rows;
}

async function updateTracking(orderId, trackingNumber) {
  const [[existing]] = await db.query('SELECT id FROM order_deliveries WHERE order_id = ?', [orderId]);
  if (existing) {
    await db.query('UPDATE order_deliveries SET tracking_number = ? WHERE order_id = ?', [trackingNumber, orderId]);
  }
  return getDelivery(orderId);
}

module.exports = { getCouriers, getCourierByCode, assignDelivery, getDelivery, getTracking, getDeliveryOrders, updateTracking };
