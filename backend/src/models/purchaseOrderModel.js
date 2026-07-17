const db = require('../config/db');

async function generatePoNumber(connection) {
  const year = new Date().getFullYear();
  const [[{ count }]] = await connection.query(
    `SELECT COUNT(*) AS count FROM purchase_orders WHERE po_number LIKE ?`,
    [`PO-${year}-%`]
  );
  const next = String(count + 1).padStart(4, '0');
  return `PO-${year}-${next}`;
}

// Creates a PO with items + quantities only - no cost yet (entered at the "paid" step)
async function createPO({ supplier_id, created_by, items }) {
  if (!items || !items.length) throw new Error('Purchase order must contain at least one item');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const po_number = await generatePoNumber(connection);
    const [result] = await connection.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, status, created_by)
       VALUES (?, ?, 'placed', ?)`,
      [po_number, supplier_id, created_by || null]
    );
    const poId = result.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO purchase_order_items (purchase_order_id, variant_id, quantity)
         VALUES (?, ?, ?)`,
        [poId, item.variant_id, item.quantity]
      );
    }

    await connection.commit();
    return getPOById(poId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getAllPOs({ status, supplier_id, limit = 100 } = {}) {
  let query = `
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND po.status = ?'; params.push(status); }
  if (supplier_id) { query += ' AND po.supplier_id = ?'; params.push(supplier_id); }
  query += ' ORDER BY po.created_at DESC LIMIT ?';
  params.push(limit);
  const [rows] = await db.query(query, params);
  return rows;
}

async function getPOById(id) {
  const [[po]] = await db.query(
    `SELECT po.*, s.name AS supplier_name, s.phone AS supplier_phone
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = ?`,
    [id]
  );
  if (!po) return null;

  const [items] = await db.query(
    `SELECT poi.*, pv.sku, pv.variant_label, p.name AS product_name
     FROM purchase_order_items poi
     JOIN product_variants pv ON pv.id = poi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE poi.purchase_order_id = ?`,
    [id]
  );

  return { ...po, items };
}

// Only allowed while still 'placed' - replaces supplier/items wholesale
async function updatePO(id, { supplier_id, items }) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'placed') throw new Error(`Cannot edit a purchase order once it is ${po.status}`);
  if (!items || !items.length) throw new Error('Purchase order must contain at least one item');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('UPDATE purchase_orders SET supplier_id = ? WHERE id = ?', [supplier_id, id]);
    await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
    for (const item of items) {
      await connection.query(
        `INSERT INTO purchase_order_items (purchase_order_id, variant_id, quantity)
         VALUES (?, ?, ?)`,
        [id, item.variant_id, item.quantity]
      );
    }

    await connection.commit();
    return getPOById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Only allowed while still 'placed'
async function deletePO(id) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'placed') throw new Error(`Cannot delete a purchase order once it is ${po.status}`);
  await db.query('DELETE FROM purchase_orders WHERE id = ?', [id]);
}

// Enters actual cost per item + transport charge. Transport is split across items by quantity share.
// landed_unit_cost = unit_cost_price + transport_share, and is auto-applied to product_variants.cost_price.
async function markPaid(id, { transport_charge = 0, items }) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'placed') throw new Error(`Purchase order must be 'placed' to mark as paid (currently ${po.status})`);
  if (!items || !items.length) throw new Error('Cost entry required for every item');

  const totalQty = po.items.reduce((sum, i) => sum + i.quantity, 0);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const existingItem of po.items) {
      const entry = items.find((i) => i.item_id === existingItem.id);
      if (!entry) throw new Error(`Missing cost entry for item ${existingItem.id}`);

      // Per-unit share, split evenly across all units in the PO (not per line) - so it can be
      // added directly to a per-unit cost to get a per-unit landed cost.
      const transport_share = totalQty > 0 ? transport_charge / totalQty : 0;
      const landed_unit_cost = parseFloat(entry.unit_cost_price) + transport_share;

      await connection.query(
        `UPDATE purchase_order_items
         SET unit_cost_price = ?, transport_share = ?, landed_unit_cost = ?
         WHERE id = ?`,
        [entry.unit_cost_price, transport_share, landed_unit_cost, existingItem.id]
      );

      await connection.query(
        'UPDATE product_variants SET cost_price = ? WHERE id = ?',
        [landed_unit_cost, existingItem.variant_id]
      );
    }

    await connection.query(
      `UPDATE purchase_orders SET status = 'paid', paid_at = NOW(), transport_charge = ? WHERE id = ?`,
      [transport_charge, id]
    );

    await connection.commit();
    return getPOById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markShipped(id) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'paid') throw new Error(`Purchase order must be 'paid' to mark as shipped (currently ${po.status})`);

  await db.query(`UPDATE purchase_orders SET status = 'shipped', shipped_at = NOW() WHERE id = ?`, [id]);
  return getPOById(id);
}

// This is when stock actually increases - creates stock_batches + stock_movements per item
async function markReceived(id, { created_by } = {}) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'shipped') throw new Error(`Purchase order must be 'shipped' to mark as received (currently ${po.status})`);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const item of po.items) {
      await connection.query(
        `INSERT INTO stock_batches (variant_id, purchase_order_id, quantity_received, quantity_remaining, unit_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [item.variant_id, id, item.quantity, item.quantity, item.landed_unit_cost]
      );

      await connection.query(
        'UPDATE product_variants SET current_stock = current_stock + ? WHERE id = ?',
        [item.quantity, item.variant_id]
      );

      await connection.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, ?, 'purchase_received', 'purchase_order', ?, ?)`,
        [item.variant_id, item.quantity, id, created_by || null]
      );
    }

    await connection.query(`UPDATE purchase_orders SET status = 'received', received_at = NOW() WHERE id = ?`, [id]);

    await connection.commit();
    return getPOById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePaidPO(id, { transport_charge, items }) {
  const po = await getPOById(id);
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'paid') throw new Error(`Can only edit costs on a 'paid' purchase order (currently ${po.status})`);

  const totalQty = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const existingItem of po.items) {
      const entry = items.find((i) => i.item_id === existingItem.id);
      if (!entry) continue;
      const transport_share = totalQty > 0 ? transport_charge / totalQty : 0;
      const landed_unit_cost = parseFloat(entry.unit_cost_price) + transport_share;
      await connection.query(
        `UPDATE purchase_order_items SET unit_cost_price = ?, transport_share = ?, landed_unit_cost = ? WHERE id = ?`,
        [entry.unit_cost_price, transport_share, landed_unit_cost, existingItem.id]
      );
      await connection.query('UPDATE product_variants SET cost_price = ? WHERE id = ?', [landed_unit_cost, existingItem.variant_id]);
    }
    await connection.query('UPDATE purchase_orders SET transport_charge = ? WHERE id = ?', [transport_charge, id]);
    await connection.commit();
    return getPOById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createPO, getAllPOs, getPOById, updatePO, deletePO, markPaid, markShipped, markReceived, updatePaidPO,
};
