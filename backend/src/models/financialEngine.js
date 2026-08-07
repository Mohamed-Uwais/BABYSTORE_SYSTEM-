const db = require('../config/db');

// Canonical status sets — every financial query MUST use these
const SETTLED = "('completed','delivered')";
const IN_TRANSIT = "('shipped','packed')";
const EXCLUDED = "('cancelled','refunded','partially_refunded')";

// Item-level revenue: qty * unit_price - discount_amount (never delivery_fee)
const ITEM_REVENUE = `COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)`;

// COGS from cost_price_snapshot ONLY — never fall back to current variant cost_price
const ITEM_COGS = `COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, 0)), 0)`;

// Returned revenue (from order_returns)
const RETURNED_REVENUE = `COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
  FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
  WHERE r.order_id = o.id), 0)`;

// Returned COGS (only when restocked)
const RETURNED_COGS = `COALESCE((SELECT SUM(r.quantity * COALESCE(oi2.cost_price_snapshot, 0))
  FROM order_returns r
  JOIN order_items oi2 ON oi2.id = r.order_item_id
  WHERE r.order_id = o.id AND r.restock = 1), 0)`;

// Net revenue subquery (for inline use in aggregate queries like dashboard)
const NET_REVENUE_SUBQUERY = `(
  SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
  FROM order_items oi WHERE oi.order_id = o.id
)`;

// Customer "total spent" — item-level revenue, settled statuses only, never delivery_fee
async function customerTotalSpent(customerIdOrCondition, params = []) {
  const isNumeric = typeof customerIdOrCondition === 'number';
  const where = isNumeric
    ? 'o.customer_id = ? AND o.status IN ' + SETTLED
    : customerIdOrCondition;
  const queryParams = isNumeric ? [customerIdOrCondition, ...params] : params;

  const [[row]] = await db.query(`
    SELECT COALESCE(SUM(sub.revenue), 0) AS total_spent
    FROM (
      SELECT o.id,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         FROM order_items oi WHERE oi.order_id = o.id) AS revenue
      FROM orders o
      WHERE ${where}
    ) sub
  `, queryParams);
  return Number(row.total_spent);
}

// Staff sales — item-level revenue, settled statuses
async function staffSalesQuery(dateCondition, params) {
  const [rows] = await db.query(`
    SELECT u.id, u.full_name, u.username, u.role,
           COUNT(DISTINCT o.id) AS orders_count,
           COALESCE(SUM(sub.revenue), 0) AS total_sales
    FROM users u
    LEFT JOIN (
      SELECT o.id, o.cashier_id,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         FROM order_items oi WHERE oi.order_id = o.id) AS revenue
      FROM orders o
      WHERE ${dateCondition} AND o.status IN ${SETTLED}
    ) sub ON sub.cashier_id = u.id
    GROUP BY u.id
    ORDER BY total_sales DESC
  `, params);
  return rows.map(r => ({ ...r, total_sales: Number(r.total_sales) }));
}

// Best sellers — item-level, settled statuses
async function bestSellersQuery(dateCondition, params, limit = 10) {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.retail_price, pv.current_stock,
           p.name AS product_name, pv.image_url,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)) AS revenue
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE ${dateCondition} AND o.status IN ${SETTLED}
    GROUP BY pv.id
    ORDER BY units_sold DESC
    LIMIT ?
  `, [...params, limit]);

  return rows.map(r => ({
    ...r,
    units_sold: Number(r.units_sold),
    revenue: Number(r.revenue),
    retail_price: Number(r.retail_price),
  }));
}

module.exports = {
  SETTLED, IN_TRANSIT, EXCLUDED,
  ITEM_REVENUE, ITEM_COGS, RETURNED_REVENUE, RETURNED_COGS,
  NET_REVENUE_SUBQUERY,
  customerTotalSpent, staffSalesQuery, bestSellersQuery,
};
