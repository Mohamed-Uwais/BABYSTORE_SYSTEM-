const db = require('../config/db');

async function generatePoNumber(connection) {
  const year = new Date().getFullYear();
  const [[{ last_number }]] = await connection.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(po_number, '-', -1) AS UNSIGNED)), 0) AS last_number
     FROM purchase_orders WHERE po_number REGEXP ?`,
    [`^PO-${year}-[0-9]+$`]
  );
  const next = String(BigInt(last_number) + 1n).padStart(4, '0');
  return `PO-${year}-${next}`;
}

// Creates a PO with items + quantities only - no cost yet (entered at the "paid" step)
async function createPO({ supplier_id, created_by, items, submission_key, invoice_reference=null, invoice_date=null }) {
  if (!items || !items.length) throw new Error('Purchase order must contain at least one item');

  const connection = await db.getConnection();
  let locked = false;
  let transactionStarted = false;
  try {
    // Acquire before beginning the transaction so waiting writers see the latest commit.
    const [[lock]] = await connection.query("SELECT GET_LOCK('littora:po-number', 10) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Purchase order creation is busy. Please try again.');
    locked = true;
    await connection.beginTransaction();
    transactionStarted = true;

    let hash=null;
    if(submission_key){
      hash=require('node:crypto').createHash('sha256').update(JSON.stringify({supplier_id,items,invoice_reference,invoice_date})).digest('hex');
      const [[saved]]=await connection.query('SELECT id,submission_hash FROM purchase_orders WHERE submission_key=? FOR UPDATE',[submission_key]);
      if(saved){
        if(saved.submission_hash!==hash)throw Error('Purchase order request changed on retry');
        const po=await getPOById(saved.id,connection);
        await connection.commit();transactionStarted=false;return po;
      }
    }
    const po_number = await generatePoNumber(connection);
    const [result] = await connection.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, status, created_by, finance_tracked)
       VALUES (?, ?, 'placed', ?, 1)`,
      [po_number, supplier_id, created_by || null]
    );
    const poId = result.insertId;
    if (invoice_reference || invoice_date) {
      if (invoice_reference && (typeof invoice_reference!=='string'||invoice_reference.trim().length>100)) throw Error('Invalid invoice reference');
      if (invoice_date && !/^\d{4}-\d{2}-\d{2}$/.test(invoice_date)) throw Error('Invalid invoice date');
      await connection.query('UPDATE purchase_orders SET invoice_reference=?,invoice_date=? WHERE id=?',[invoice_reference?.trim()||null,invoice_date||null,poId]);
    }
    if(submission_key)await connection.query('UPDATE purchase_orders SET submission_key=?,submission_hash=? WHERE id=?',[submission_key,hash,poId]);

    for (const item of items) {
      if(!Number.isSafeInteger(item.quantity)||item.quantity<=0) throw Error('Purchase quantity must be a positive integer');
      if(item.unit_cost_price!=null && (!Number.isFinite(item.unit_cost_price)||item.unit_cost_price<0))throw Error('Invalid unit purchase cost');
      await connection.query(
        `INSERT INTO purchase_order_items (purchase_order_id, variant_id, quantity,unit_cost_price)
         VALUES (?, ?, ?, ?)`,
        [poId, item.variant_id, item.quantity,item.unit_cost_price??null]
      );
    }

    const po = await getPOById(poId, connection);
    await connection.commit();
    transactionStarted = false;
    return po;
  } catch (error) {
    if (transactionStarted) {
      try { await connection.rollback(); } catch { /* Preserve the original error. */ }
    }
    throw error;
  } finally {
    if (locked) {
      try {
        const [[result]] = await connection.query("SELECT RELEASE_LOCK('littora:po-number') AS released");
        if (Number(result.released) !== 1) connection.destroy();
      } catch { connection.destroy(); }
    }
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

async function getPOById(id, connection = db) {
  const [[po]] = await connection.query(
    `SELECT po.*, s.name AS supplier_name, s.phone AS supplier_phone
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = ?`,
    [id]
  );
  if (!po) return null;

  const [items] = await connection.query(
    `SELECT poi.*, COALESCE((SELECT SUM(b.quantity_received) FROM stock_batches b WHERE b.purchase_order_item_id=poi.id),0) AS received_quantity, pv.sku, pv.variant_label, p.name AS product_name
     FROM purchase_order_items poi
     JOIN product_variants pv ON pv.id = poi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE poi.purchase_order_id = ?`,
    [id]
  );

  const [charges]=await connection.query('SELECT * FROM purchase_receipt_charges WHERE purchase_order_id=? ORDER BY id',[id]);
  const [payments]=await connection.query('SELECT p.*,u.full_name AS payer, operator.full_name AS operator_name,r.reason AS reversal_reason,r.reversed_at,rev.full_name AS reverser FROM purchase_payments p JOIN users u ON u.id=p.paid_by JOIN users operator ON operator.id=p.operator_id LEFT JOIN purchase_payment_reversals r ON r.payment_id=p.id LEFT JOIN users rev ON rev.id=r.reversed_by WHERE p.purchase_order_id=? ORDER BY p.id',[id]);
  return { ...po, items, charges, payments };
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

    const [[locked]] = await connection.query('SELECT status FROM purchase_orders WHERE id=? FOR UPDATE',[id]);
    if (locked?.status !== 'placed') throw Error('Reload the purchase order before editing');
    await connection.query('UPDATE purchase_orders SET supplier_id = ? WHERE id = ?', [supplier_id, id]);
    await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
    for (const item of items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('Enter a positive whole quantity');
      if (item.unit_cost_price != null && (!Number.isFinite(Number(item.unit_cost_price)) || Number(item.unit_cost_price)<0)) throw Error('Invalid purchase cost');
      await connection.query(
        `INSERT INTO purchase_order_items (purchase_order_id, variant_id, quantity, unit_cost_price)
         VALUES (?, ?, ?, ?)`,
        [id, item.variant_id, item.quantity, item.unit_cost_price ?? null]
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
    const [[locked]]=await connection.query('SELECT status FROM purchase_orders WHERE id=? FOR UPDATE',[id]);
    if(locked.status!=='placed')throw Error('Purchase order status changed. Reload before editing costs.');
    if(!Number.isFinite(Number(transport_charge)) || Number(transport_charge)<0)throw Error('Transport charge must be nonnegative');
    const [[existingPayment]]=await connection.query('SELECT id FROM purchase_payments WHERE purchase_order_id=? AND charge_id IS NULL LIMIT 1',[id]);
    if(existingPayment)throw Error('Supplier costs are locked after payment; record an audited adjustment');
    if(items.some(i=>i.unit_cost_price==null || i.unit_cost_price==='' || typeof i.unit_cost_price==='boolean' || !Number.isFinite(Number(i.unit_cost_price)) || Number(i.unit_cost_price)<0))throw Error('Enter valid purchase costs');


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
async function markReceived(id, { created_by, targets, charges=[], preview=false } = {}) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[po]] = await connection.query('SELECT id, status, finance_tracked,transport_charge FROM purchase_orders WHERE id = ? FOR UPDATE', [id]);
    if (!po) throw new Error('Purchase order not found');
    if (po.status === 'received' && !preview) { await connection.commit(); return getPOById(id); }
    if (po.status !== 'shipped') throw new Error('Purchase order must be shipped to mark as received');
    const [items] = await connection.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY variant_id,id', [id]);
    const lineIds = new Set(items.map(item=>String(item.id)));
    if (targets != null && (Array.isArray(targets) || typeof targets !== 'object' || Object.keys(targets).some(key=>!lineIds.has(key)))) throw Error('Invalid receipt lines');
    let complete = true;
    const receiving=[];
    const orderedQty=items.reduce((sum,i)=>sum+i.quantity,0);
    let offset=0;

    for (const item of items) {
      const [[batch]] = await connection.query('SELECT COALESCE(SUM(quantity_received),0) AS received FROM stock_batches WHERE purchase_order_item_id=?',[item.id]);
      const received = Number(batch.received);
      const target = targets == null ? item.quantity : targets[item.id] ?? received;
      if (!Number.isSafeInteger(target) || target < received || target > item.quantity) throw Error('Receipt quantity changed or exceeds the order. Reload the purchase order.');
      const incoming = target-received;
      const shareAt=n=>Math.round(Number(po.transport_charge||0)*100*n/orderedQty);
      const freight=shareAt(offset+target)-shareAt(offset+received);
      offset+=item.quantity;
      if(target<item.quantity) complete=false;
      if(!incoming) continue;
      if(item.landed_unit_cost==null) throw Error('Enter landed cost before receiving this line');

      receiving.push({...item,incoming,freight});
    }
    const allocated=receiving.length ? require('../utils/purchaseCharges')(receiving,charges) : [];
    const receiptLines = receiving.map(item => {
      const extra = allocated.reduce((sum, charge) => sum + (charge.allocation[item.id] || 0), 0);
      const base = po.finance_tracked
        ? Math.round(Number(item.unit_cost_price)*100)*item.incoming + item.freight
        : Math.round(Number(item.landed_unit_cost)*100)*item.incoming;
      return {...item, extra, totalCents: base + extra};
    });
    if (preview) {
      await connection.commit();
      return {lines: receiptLines.map(({id, incoming, freight, extra, totalCents}) =>
        ({id, incoming, freight, extra, totalCents})), charges: allocated};
    }
    for(const charge of allocated){
      await connection.query('INSERT INTO purchase_receipt_charges(purchase_order_id,description,payee,amount,allocation,created_by) VALUES(?,?,?,?,?,?)',
        [id,charge.description.trim(),charge.payee.trim(),charge.cents/100,JSON.stringify(charge.allocation),created_by]);
    }
    for(const item of receiptLines){
      const {incoming, totalCents} = item;
      const lower=Math.floor(totalCents/incoming),higherUnits=totalCents%incoming;
      for(const [qty,cost] of [[incoming-higherUnits,lower],[higherUnits,lower+1]]){
        if(qty)await connection.query('INSERT INTO stock_batches (variant_id,purchase_order_id,purchase_order_item_id,quantity_received,quantity_remaining,unit_cost) VALUES(?,?,?,?,?,?)',
          [item.variant_id,id,item.id,qty,qty,cost/100]);
      }

      await connection.query(
        'UPDATE product_variants SET current_stock = current_stock + ?,cost_price=? WHERE id = ?',
        [incoming,totalCents/100/incoming,item.variant_id]
      );

      await connection.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, ?, 'purchase_received', 'purchase_order', ?, ?)`,
        [item.variant_id, incoming, id, created_by || null]
      );
    }

    if (complete) await connection.query(`UPDATE purchase_orders SET status = 'received', received_at = NOW() WHERE id = ?`, [id]);

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
    const [[locked]]=await connection.query('SELECT status FROM purchase_orders WHERE id=? FOR UPDATE',[id]);
    if(locked.status!=='paid')throw Error('Purchase order status changed. Reload before editing costs.');
    if(!Number.isFinite(Number(transport_charge)) || Number(transport_charge)<0)throw Error('Transport charge must be nonnegative');
    const [[existingPayment]]=await connection.query('SELECT id FROM purchase_payments WHERE purchase_order_id=? AND charge_id IS NULL LIMIT 1',[id]);
    if(existingPayment)throw Error('Supplier costs are locked after payment; record an audited adjustment');
    if(items.some(i=>i.unit_cost_price==null || i.unit_cost_price==='' || typeof i.unit_cost_price==='boolean' || !Number.isFinite(Number(i.unit_cost_price)) || Number(i.unit_cost_price)<0))throw Error('Enter valid purchase costs');

    for (const existingItem of po.items) {
      const entry = items.find((i) => i.item_id === existingItem.id);
      if (!entry) continue;
      const transport_share = totalQty > 0 ? transport_charge / totalQty : 0;
      const landed_unit_cost = parseFloat(entry.unit_cost_price) + transport_share;
      await connection.query(
        `UPDATE purchase_order_items SET unit_cost_price = ?, transport_share = ?, landed_unit_cost = ? WHERE id = ?`,
        [entry.unit_cost_price, transport_share, landed_unit_cost, existingItem.id]
      );

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
