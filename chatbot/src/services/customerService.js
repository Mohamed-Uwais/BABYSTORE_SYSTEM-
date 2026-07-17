const db = require('../config/db');
const { normalize } = require('../utils/phoneUtils');

async function findByPhone(phone) {
  const n = normalize(phone);
  if (!n) return null;
  const [rows] = await db.query(
    `SELECT id, phone, full_name, email, address, city, customer_type, loyalty_tier, loyalty_points_balance, credit_balance
     FROM customers WHERE phone = ? LIMIT 1`,
    [n]
  );
  return rows[0] || null;
}

async function findOrCreate(phone, name) {
  const n = normalize(phone);
  let customer = await findByPhone(n);
  if (customer) {
    if (name && !customer.full_name) {
      await db.query(`UPDATE customers SET full_name = ? WHERE id = ?`, [name, customer.id]);
      customer.full_name = name;
    }
    return customer;
  }
  const [result] = await db.query(
    `INSERT INTO customers (phone, full_name, customer_type, source_channel) VALUES (?, ?, 'walk_in', 'chatbot')`,
    [n, name || null]
  );
  return { id: result.insertId, phone: n, full_name: name || null, customer_type: 'walk_in', loyalty_tier: null, credit_balance: 0 };
}

async function getLastOrderProduct(customerId) {
  const [rows] = await db.query(
    `SELECT p.name FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC LIMIT 1`,
    [customerId]
  );
  return rows[0]?.name || 'diapers';
}

async function getRecentOrders(customerId, limit = 3) {
  const [rows] = await db.query(
    `SELECT o.order_number, o.grand_total, o.status, o.created_at,
       GROUP_CONCAT(CONCAT(p.name, ' × ', oi.quantity) SEPARATOR ', ') AS items_summary
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE o.customer_id = ?
     GROUP BY o.id ORDER BY o.created_at DESC LIMIT ?`,
    [customerId, limit]
  );
  return rows;
}

module.exports = { findByPhone, findOrCreate, getLastOrderProduct, getRecentOrders };
