const db = require('../config/db');

async function getAllCustomers() {
  const [rows] = await db.query(`
    SELECT c.*,
           COUNT(DISTINCT o.id) AS total_orders,
           COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.grand_total ELSE 0 END), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return rows.map(r => ({ ...r, total_spent: Number(r.total_spent), credit_balance: Number(r.credit_balance) }));
}

async function getCustomerById(id) {
  const [[customer]] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
  if (!customer) return null;

  const [[stats]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(CASE WHEN status != 'cancelled' THEN grand_total ELSE 0 END), 0) AS total_spent
    FROM orders WHERE customer_id = ?
  `, [id]);

  const [orders] = await db.query(`
    SELECT id, order_number, status, grand_total, created_at
    FROM orders WHERE customer_id = ? ORDER BY created_at DESC
  `, [id]);

  const [ledger] = await db.query(`
    SELECT cl.*, u.full_name AS created_by_name
    FROM customer_ledger cl
    LEFT JOIN users u ON u.id = cl.created_by
    WHERE cl.customer_id = ? ORDER BY cl.created_at DESC
  `, [id]);

  return {
    ...customer,
    credit_balance: Number(customer.credit_balance),
    total_orders: stats.total_orders,
    total_spent: Number(stats.total_spent),
    orders: orders.map(o => ({ ...o, grand_total: Number(o.grand_total) })),
    ledger: ledger.map(l => ({ ...l, credit_delta: Number(l.credit_delta) })),
  };
}

async function getCustomerByPhone(phone) {
  const [rows] = await db.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  return rows[0] || null;
}

async function findOrCreateCustomer({ phone, full_name, email, address, city, customer_type, source_channel }) {
  const existing = await getCustomerByPhone(phone);
  if (existing) return existing;

  const [result] = await db.query(
    `INSERT INTO customers (phone, full_name, email, address, city, customer_type, source_channel)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [phone, full_name || null, email || null, address || null, city || null,
     customer_type || 'walk_in', source_channel || 'pos']
  );

  return getCustomerByPhone(phone) ?? { id: result.insertId, phone };
}

async function updateCustomer(id, data) {
  const { full_name, phone, email, address, city } = data;
  await db.query(
    `UPDATE customers SET full_name = ?, phone = ?, email = ?, address = ?, city = ? WHERE id = ?`,
    [full_name || null, phone, email || null, address || null, city || null, id]
  );
  return getCustomerById(id);
}

async function convertToLoyalty(id) {
  const [[customer]] = await db.query('SELECT customer_type FROM customers WHERE id = ?', [id]);
  if (!customer) throw new Error('Customer not found');
  if (customer.customer_type === 'loyalty') throw new Error('Customer is already a loyalty member');

  await db.query(
    `UPDATE customers SET customer_type = 'loyalty', loyalty_tier = 'silver' WHERE id = ?`,
    [id]
  );
  return getCustomerById(id);
}

async function recordCreditRepayment(customerId, amount, notes, createdBy) {
  if (amount <= 0) throw new Error('Amount must be positive');

  const [[customer]] = await db.query('SELECT credit_balance FROM customers WHERE id = ?', [customerId]);
  if (!customer) throw new Error('Customer not found');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await addLedgerEntry(connection, {
      customer_id: customerId,
      entry_type: 'credit_repaid',
      credit_delta: -amount,
      reference_type: 'manual',
      notes: notes || `Credit repayment of Rs. ${amount}`,
      created_by: createdBy,
    });

    await connection.commit();
    return getCustomerById(customerId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function addLedgerEntry(connection, {
  customer_id, entry_type, points_delta = 0, credit_delta = 0,
  reference_type, reference_id, notes, created_by
}) {
  await connection.query(
    `INSERT INTO customer_ledger
      (customer_id, entry_type, points_delta, credit_delta, reference_type, reference_id, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, entry_type, points_delta, credit_delta, reference_type || null,
     reference_id || null, notes || null, created_by || null]
  );

  await connection.query(
    `UPDATE customers
     SET loyalty_points_balance = loyalty_points_balance + ?,
         credit_balance = credit_balance + ?
     WHERE id = ?`,
    [points_delta, credit_delta, customer_id]
  );
}

module.exports = {
  getAllCustomers, getCustomerById, getCustomerByPhone,
  findOrCreateCustomer, updateCustomer, convertToLoyalty,
  recordCreditRepayment, addLedgerEntry,
};
