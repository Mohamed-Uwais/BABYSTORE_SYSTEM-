const db = require('../config/db');

async function getAllSuppliers() {
  const [rows] = await db.query(
    'SELECT * FROM suppliers WHERE is_active = TRUE ORDER BY name ASC'
  );
  return rows;
}

async function getSupplierById(id) {
  const [rows] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createSupplier({ name, contact_person, phone, email, address, notes }) {
  const [result] = await db.query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, contact_person || null, phone || null, email || null, address || null, notes || null]
  );
  return getSupplierById(result.insertId);
}

async function updateSupplier(id, { name, contact_person, phone, email, address, notes }) {
  await db.query(
    `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, notes = ?
     WHERE id = ?`,
    [name, contact_person || null, phone || null, email || null, address || null, notes || null, id]
  );
  return getSupplierById(id);
}

async function deactivateSupplier(id) {
  await db.query('UPDATE suppliers SET is_active = FALSE WHERE id = ?', [id]);
}

module.exports = { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deactivateSupplier };
