const db = require('../config/db');

async function getNextNumber() {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  const [[row]] = await db.query(
    `SELECT quotation_number FROM quotations WHERE quotation_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const seq = row ? parseInt(row.quotation_number.replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

async function create({ customer_id, pricing_mode, items, subtotal, delivery_fee, discount_total, grand_total, notes, created_by }) {
  const quotation_number = await getNextNumber();
  const valid_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [result] = await db.query(
    `INSERT INTO quotations (quotation_number, customer_id, pricing_mode, items, subtotal, delivery_fee, discount_total, grand_total, notes, valid_until, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [quotation_number, customer_id || null, pricing_mode || 'retail', JSON.stringify(items), subtotal, delivery_fee || 0, discount_total || 0, grand_total, notes || null, valid_until, created_by || null]
  );
  return { id: result.insertId, quotation_number, valid_until };
}

async function getAll() {
  const [rows] = await db.query(`
    SELECT q.*, c.full_name AS customer_name, c.phone AS customer_phone, u.full_name AS created_by_name
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    LEFT JOIN users u ON u.id = q.created_by
    ORDER BY q.created_at DESC
  `);
  return rows;
}

async function getById(id) {
  const [[row]] = await db.query(`
    SELECT q.*, c.full_name AS customer_name, c.phone AS customer_phone, u.full_name AS created_by_name
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    LEFT JOIN users u ON u.id = q.created_by
    WHERE q.id = ?
  `, [id]);
  return row || null;
}

async function updateStatus(id, status) {
  await db.query('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
}

module.exports = { create, getAll, getById, updateStatus };
