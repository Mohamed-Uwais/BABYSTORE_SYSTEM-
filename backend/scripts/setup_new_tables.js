const db = require('../src/config/db');

async function run() {
  // 1. Create order_status_history table
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id INT UNSIGNED NOT NULL,
      status VARCHAR(50) NOT NULL,
      changed_by INT UNSIGNED NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);
  console.log('order_status_history table created');

  // 2. Backfill existing orders
  const [orders] = await db.query('SELECT id, status, created_at, cashier_id FROM orders');
  for (const o of orders) {
    const [existing] = await db.query('SELECT id FROM order_status_history WHERE order_id = ?', [o.id]);
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO order_status_history (order_id, status, changed_by, notes, created_at) VALUES (?, ?, ?, ?, ?)',
        [o.id, o.status, o.cashier_id, 'Initial status', o.created_at]
      );
    }
  }
  console.log('Backfilled ' + orders.length + ' orders');

  // 3. Check if product_variants has reorder_suggestion_qty
  const [cols] = await db.query('SHOW COLUMNS FROM product_variants LIKE "reorder_suggestion_qty"');
  if (cols.length === 0) {
    await db.query('ALTER TABLE product_variants ADD COLUMN reorder_suggestion_qty INT UNSIGNED DEFAULT 10');
    console.log('Added reorder_suggestion_qty column');
  } else {
    console.log('reorder_suggestion_qty already exists');
  }

  process.exit();
}

run().catch(e => { console.error(e.message); process.exit(1); });
