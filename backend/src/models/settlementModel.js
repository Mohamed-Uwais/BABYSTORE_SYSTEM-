const db = require('../config/db');
const customerModel = require('./customerModel');

async function getCourierSummaries() {
  const [rows] = await db.query(`
    SELECT c.id AS courier_customer_id, c.full_name AS courier_name, c.phone AS courier_code,
           c.credit_balance AS outstanding,
           (SELECT COUNT(*) FROM order_deliveries od
            JOIN orders o ON o.id = od.order_id
            JOIN couriers cr ON cr.id = od.courier_id
            WHERE cr.code = LOWER(c.phone) AND od.settled = FALSE
              AND o.status NOT IN ('cancelled')) AS unsettled_orders,
           (SELECT MIN(o2.created_at) FROM order_deliveries od2
            JOIN orders o2 ON o2.id = od2.order_id
            JOIN couriers cr2 ON cr2.id = od2.courier_id
            WHERE cr2.code = LOWER(c.phone) AND od2.settled = FALSE
              AND o2.status NOT IN ('cancelled')) AS oldest_pending
    FROM customers c
    WHERE c.phone IN ('KOOMBIYO', 'FARDAR')
    ORDER BY c.full_name
  `);
  return rows.map(r => ({
    ...r,
    outstanding: Number(r.outstanding),
    days_pending: r.oldest_pending ? Math.floor((Date.now() - new Date(r.oldest_pending).getTime()) / 86400000) : 0,
  }));
}

async function getUnsettledOrders(courierCode) {
  const [rows] = await db.query(`
    SELECT o.id AS order_id, o.order_number, o.created_at AS ship_date,
           (o.subtotal - o.discount_total) AS item_value,
           o.delivery_fee,
           od.id AS delivery_id, od.tracking_number,
           DATEDIFF(NOW(), o.created_at) AS days_pending
    FROM order_deliveries od
    JOIN orders o ON o.id = od.order_id
    JOIN couriers cr ON cr.id = od.courier_id
    WHERE cr.code = ? AND od.settled = FALSE
      AND o.status NOT IN ('cancelled')
    ORDER BY o.created_at ASC
  `, [courierCode.toLowerCase()]);
  return rows.map(r => ({ ...r, item_value: Number(r.item_value), delivery_fee: Number(r.delivery_fee) }));
}

async function recordSettlement({ courierCode, amount, deliveryIds, notes, userId }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[courier]] = await conn.query(
      'SELECT id FROM customers WHERE phone = ?', [courierCode.toUpperCase()]
    );
    if (!courier) throw new Error('Courier account not found');

    if (deliveryIds && deliveryIds.length > 0) {
      await conn.query(
        'UPDATE order_deliveries SET settled = TRUE, settled_at = NOW() WHERE id IN (?) AND settled = FALSE',
        [deliveryIds]
      );
    }

    await customerModel.addLedgerEntry(conn, {
      customer_id: courier.id,
      entry_type: 'credit_repaid',
      credit_delta: -Math.abs(amount),
      reference_type: 'settlement',
      reference_id: null,
      notes: notes || `Settlement — Rs. ${Math.abs(amount).toLocaleString('en-LK')}`,
      created_by: userId,
    });

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getBackfillPreview() {
  const [rows] = await db.query(`
    SELECT o.id AS order_id, o.order_number, o.created_at,
           (o.subtotal - o.discount_total) AS item_value,
           cr.name AS courier_name, cr.code AS courier_code,
           EXISTS(SELECT 1 FROM customer_ledger cl
             JOIN customers cust ON cust.id = cl.customer_id AND cust.phone = UPPER(cr.code)
             WHERE cl.reference_type = 'order' AND cl.reference_id = o.id
               AND cl.entry_type = 'credit_issued') AS has_ledger_entry
    FROM order_deliveries od
    JOIN orders o ON o.id = od.order_id
    JOIN couriers cr ON cr.id = od.courier_id
    WHERE o.status NOT IN ('cancelled')
    ORDER BY o.created_at DESC
  `);
  const missing = rows.filter(r => !r.has_ledger_entry);
  return {
    total_courier_orders: rows.length,
    already_tracked: rows.length - missing.length,
    missing_entries: missing.map(r => ({
      order_id: r.order_id,
      order_number: r.order_number,
      date: r.created_at,
      courier: r.courier_name,
      item_value: Number(r.item_value),
    })),
  };
}

module.exports = { getCourierSummaries, getUnsettledOrders, recordSettlement, getBackfillPreview };
