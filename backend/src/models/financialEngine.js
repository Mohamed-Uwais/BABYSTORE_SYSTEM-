const db = require('../config/db');

// Canonical status sets — every financial query MUST use these
const SETTLED = "('completed','delivered','partially_refunded')";
const IN_TRANSIT = "('shipped','packed')";
const EXCLUDED = "('cancelled','refunded')";

// Item-level revenue: qty * unit_price - discount_amount (never delivery_fee)
const ITEM_REVENUE = `COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)`;

// COGS from cost_price_snapshot, falling back to variant.cost_price
const ITEM_COGS = `COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)), 0)`;

// Returned revenue (from order_returns)
const RETURNED_REVENUE = `COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
  FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
  WHERE r.order_id = o.id), 0)`;

// Returned COGS (only when restocked)
const RETURNED_COGS = `COALESCE((SELECT SUM(r.quantity * COALESCE(oi2.cost_price_snapshot, pv2.cost_price, 0))
  FROM order_returns r
  JOIN order_items oi2 ON oi2.id = r.order_item_id
  JOIN product_variants pv2 ON pv2.id = oi2.variant_id
  WHERE r.order_id = o.id AND r.restock = 1), 0)`;

// Net revenue subquery (for inline use in aggregate queries like dashboard)
const NET_REVENUE_SUBQUERY = `(
  SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         - COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
            FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
            WHERE r.order_id = o.id), 0)
  FROM order_items oi WHERE oi.order_id = o.id
)`;

// Customer "total spent" — item-level net revenue, settled statuses only, never delivery_fee
async function customerTotalSpent(customerIdOrCondition, params = []) {
  const isNumeric = typeof customerIdOrCondition === 'number';
  const where = isNumeric
    ? 'o.customer_id = ? AND o.status IN ' + SETTLED
    : customerIdOrCondition;
  const queryParams = isNumeric ? [customerIdOrCondition, ...params] : params;

  const [[row]] = await db.query(`
    SELECT COALESCE(SUM(sub.net_revenue), 0) AS total_spent
    FROM (
      SELECT o.id,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         FROM order_items oi WHERE oi.order_id = o.id)
        - COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
           FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
           WHERE r.order_id = o.id), 0) AS net_revenue
      FROM orders o
      WHERE ${where}
    ) sub
  `, queryParams);
  return Number(row.total_spent);
}

// Staff sales — item-level net revenue, settled statuses
async function staffSalesQuery(dateCondition, params) {
  const [rows] = await db.query(`
    SELECT u.id, u.full_name, u.username, u.role,
           COUNT(DISTINCT o.id) AS orders_count,
           COALESCE(SUM(sub.net_revenue), 0) AS total_sales
    FROM users u
    LEFT JOIN (
      SELECT o.id, o.cashier_id,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         FROM order_items oi WHERE oi.order_id = o.id)
        - COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
           FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
           WHERE r.order_id = o.id), 0) AS net_revenue
      FROM orders o
      WHERE ${dateCondition} AND o.status IN ${SETTLED}
    ) sub ON sub.cashier_id = u.id
    GROUP BY u.id
    ORDER BY total_sales DESC
  `, params);
  return rows.map(r => ({ ...r, total_sales: Number(r.total_sales) }));
}

// Best sellers — item-level, settled statuses, net of returns
async function bestSellersQuery(dateCondition, params, limit = 10) {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.retail_price, pv.current_stock,
           p.name AS product_name, pv.image_url,
           SUM(oi.quantity) AS gross_units,
           SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)) AS gross_revenue,
           COALESCE((SELECT SUM(r.quantity) FROM order_returns r WHERE r.order_item_id = oi.id), 0) AS returned_units
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE ${dateCondition} AND o.status IN ${SETTLED}
    GROUP BY pv.id
    ORDER BY gross_units DESC
    LIMIT ?
  `, [...params, limit]);

  return rows.map(r => {
    const netUnits = Number(r.gross_units) - Number(r.returned_units);
    const unitPrice = Number(r.gross_units) > 0 ? Number(r.gross_revenue) / Number(r.gross_units) : 0;
    return {
      ...r,
      units_sold: Math.max(0, netUnits),
      revenue: Number(unitPrice * netUnits),
      retail_price: Number(r.retail_price),
    };
  });
}

module.exports = {
  SETTLED, IN_TRANSIT, EXCLUDED,
  ITEM_REVENUE, ITEM_COGS, RETURNED_REVENUE, RETURNED_COGS,
  NET_REVENUE_SUBQUERY,
  customerTotalSpent, staffSalesQuery, bestSellersQuery,
};
