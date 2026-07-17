const db = require('../config/db');

// Manual stock adjustment (+/-). Atomic: locks the variant row, refuses to go below zero,
// updates current_stock and logs the movement in one transaction.
async function adjustStock({ variant_id, change_qty, created_by }) {
  const qty = parseInt(change_qty, 10);
  if (!qty) throw new Error('change_qty must be a non-zero integer');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[variant]] = await connection.query(
      'SELECT current_stock FROM product_variants WHERE id = ? FOR UPDATE',
      [variant_id]
    );
    if (!variant) throw new Error(`Variant ${variant_id} not found`);

    const newStock = variant.current_stock + qty;
    if (newStock < 0) {
      throw new Error(`Adjustment would take stock below zero (have ${variant.current_stock}, change ${qty})`);
    }

    await connection.query(
      'UPDATE product_variants SET current_stock = ? WHERE id = ?',
      [newStock, variant_id]
    );

    await connection.query(
      `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, created_by)
       VALUES (?, ?, 'manual_adjustment', 'manual', ?)`,
      [variant_id, qty, created_by || null]
    );

    await connection.commit();
    return { variant_id, change_qty: qty, new_stock: newStock };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getMovements(variant_id, limit = 50) {
  const [rows] = await db.query(
    `SELECT sm.*, u.full_name AS created_by_name
     FROM stock_movements sm
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE sm.variant_id = ?
     ORDER BY sm.created_at DESC
     LIMIT ?`,
    [variant_id, limit]
  );
  return rows;
}

async function stockToggle({ variant_id, new_stock, created_by }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[variant]] = await connection.query(
      'SELECT current_stock FROM product_variants WHERE id = ? FOR UPDATE',
      [variant_id]
    );
    if (!variant) throw new Error(`Variant ${variant_id} not found`);

    const change = new_stock - variant.current_stock;
    if (change === 0) {
      await connection.commit();
      return { variant_id, change_qty: 0, new_stock: variant.current_stock };
    }

    await connection.query('UPDATE product_variants SET current_stock = ? WHERE id = ?', [new_stock, variant_id]);
    await connection.query(
      `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, created_by)
       VALUES (?, ?, 'stock_toggle', 'stock_toggle', ?)`,
      [variant_id, change, created_by || null]
    );

    await connection.commit();
    return { variant_id, change_qty: change, new_stock };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getAllVariantsSimple() {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock,
           p.name AS product_name, p.id AS product_id
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = TRUE AND p.is_active = TRUE
    ORDER BY p.name ASC, pv.variant_label ASC
  `);
  return rows;
}

module.exports = { adjustStock, getMovements, stockToggle, getAllVariantsSimple };
