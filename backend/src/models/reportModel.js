const db = require('../config/db');

async function salesReport({ from, to }) {
  const [orders] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.channel, o.status,
           o.subtotal, o.discount_total, o.delivery_fee, o.grand_total,
           c.full_name AS customer_name, c.phone AS customer_phone,
           u.full_name AS cashier_name,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
           (SELECT GROUP_CONCAT(DISTINCT op.payment_method) FROM order_payments op WHERE op.order_id = o.id) AS payment_methods
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = o.cashier_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
    ORDER BY o.created_at DESC
  `, [from, to]);

  const [[summary]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(grand_total), 0) AS total_revenue,
           COALESCE(SUM(discount_total), 0) AS total_discounts,
           COALESCE(AVG(grand_total), 0) AS avg_order_value
    FROM orders
    WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND status NOT IN ('cancelled')
  `, [from, to]);

  return { orders, summary };
}

async function creditReport() {
  const [customers] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.loyalty_tier, c.credit_balance,
           (SELECT MAX(cl.created_at) FROM customer_ledger cl WHERE cl.customer_id = c.id AND cl.entry_type = 'credit_issued') AS last_credit_date,
           (SELECT MAX(cl.created_at) FROM customer_ledger cl WHERE cl.customer_id = c.id AND cl.entry_type = 'credit_repaid') AS last_repayment_date
    FROM customers c
    WHERE c.credit_balance > 0
    ORDER BY c.credit_balance DESC
  `);

  const [[{ total_outstanding }]] = await db.query(
    'SELECT COALESCE(SUM(credit_balance), 0) AS total_outstanding FROM customers WHERE credit_balance > 0'
  );

  return { customers, total_outstanding };
}

async function purchaseReport({ from, to, supplier_id, status }) {
  let query = `
    SELECT po.id, po.po_number, po.status, po.transport_charge, po.created_at, po.received_at,
           s.name AS supplier_name,
           (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_count,
           (SELECT COALESCE(SUM(poi.quantity * COALESCE(poi.landed_unit_cost, poi.unit_cost_price, 0)), 0)
            FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_cost
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
  `;
  const params = [from, to];

  if (supplier_id) { query += ' AND po.supplier_id = ?'; params.push(supplier_id); }
  if (status) { query += ' AND po.status = ?'; params.push(status); }
  query += ' ORDER BY po.created_at DESC';

  const [orders] = await db.query(query, params);

  const [[summary]] = await db.query(`
    SELECT COUNT(*) AS total_pos,
           COALESCE(SUM(sub.total_cost), 0) AS total_spent,
           COALESCE(AVG(sub.total_cost), 0) AS avg_po_value
    FROM (
      SELECT po.id,
             (SELECT COALESCE(SUM(poi.quantity * COALESCE(poi.landed_unit_cost, poi.unit_cost_price, 0)), 0)
              FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_cost
      FROM purchase_orders po
      WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        ${supplier_id ? 'AND po.supplier_id = ' + Number(supplier_id) : ''}
        ${status ? "AND po.status = '" + status.replace(/'/g, '') + "'" : ''}
    ) sub
  `, [from, to]);

  return { orders, summary };
}

async function stockReport({ low_only, category_id, brand_id, sort_by }) {
  let query = `
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock, pv.retail_price, pv.cost_price,
           pv.weight_grams,
           COALESCE(pv.low_stock_threshold, p.low_stock_threshold) AS threshold,
           p.id AS product_id, p.name AS product_name, p.category_id, p.brand_id,
           c.name AS category_name, b.name AS brand_name,
           (SELECT MAX(sm.created_at) FROM stock_movements sm WHERE sm.variant_id = pv.id) AS last_movement
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE pv.is_active = TRUE AND p.is_active = TRUE
  `;
  const params = [];

  if (low_only === 'true') {
    query += ' AND pv.current_stock <= COALESCE(pv.low_stock_threshold, p.low_stock_threshold)';
  }
  if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
  if (brand_id) { query += ' AND p.brand_id = ?'; params.push(brand_id); }

  if (sort_by === 'stock_asc') query += ' ORDER BY pv.current_stock ASC';
  else if (sort_by === 'name') query += ' ORDER BY p.name ASC, pv.variant_label ASC';
  else if (sort_by === 'last_movement') query += ' ORDER BY last_movement DESC';
  else query += ' ORDER BY pv.current_stock ASC';

  const [variants] = await db.query(query, params);

  const [[valuation]] = await db.query(`
    SELECT COALESCE(SUM(pv.current_stock * pv.retail_price), 0) AS total_retail_value,
           COALESCE(SUM(pv.current_stock * pv.cost_price), 0) AS total_cost_value
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = TRUE AND p.is_active = TRUE
  `);

  return { variants, valuation };
}

async function customerReport() {
  const [[totals]] = await db.query(`
    SELECT COUNT(*) AS total_customers,
           SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_this_month,
           SUM(CASE WHEN customer_type = 'loyalty' THEN 1 ELSE 0 END) AS loyalty_count,
           SUM(CASE WHEN customer_type = 'walk_in' THEN 1 ELSE 0 END) AS walkin_count
    FROM customers
  `);

  const [tiers] = await db.query(`
    SELECT loyalty_tier, COUNT(*) AS count FROM customers
    WHERE customer_type = 'loyalty'
    GROUP BY loyalty_tier
  `);

  const [topBySpend] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.loyalty_tier,
           COALESCE(SUM(o.grand_total), 0) AS total_spend,
           COUNT(o.id) AS order_count
    FROM customers c
    JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY c.id
    ORDER BY total_spend DESC LIMIT 10
  `);

  const [topByFrequency] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.loyalty_tier,
           COUNT(o.id) AS order_count,
           COALESCE(SUM(o.grand_total), 0) AS total_spend
    FROM customers c
    JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY c.id
    ORDER BY order_count DESC LIMIT 10
  `);

  const [churnRisk] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.loyalty_tier, c.customer_type,
           MAX(o.created_at) AS last_order_date,
           DATEDIFF(NOW(), MAX(o.created_at)) AS days_since_last_order
    FROM customers c
    JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY c.id
    HAVING days_since_last_order > 30
    ORDER BY days_since_last_order DESC
  `);

  return { totals, tiers, topBySpend, topByFrequency, churnRisk };
}

async function profitReport({ from, to }) {
  const [orders] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.grand_total, o.status,
           c.full_name AS customer_name,
           COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS revenue,
           COALESCE(SUM(COALESCE(oi.cost_price_snapshot, pv.cost_price, 0) * oi.quantity), 0) AS cogs
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ('completed', 'partially_refunded')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [from, to]);

  const [[summary]] = await db.query(`
    SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total_revenue,
           COALESCE(SUM(COALESCE(oi.cost_price_snapshot, pv.cost_price, 0) * oi.quantity), 0) AS total_cogs
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ('completed', 'partially_refunded')
  `, [from, to]);

  const grossProfit = summary.total_revenue - summary.total_cogs;
  const margin = summary.total_revenue > 0 ? (grossProfit / summary.total_revenue * 100) : 0;

  const [dailyTrend] = await db.query(`
    SELECT DATE(o.created_at) AS date,
           SUM(oi.unit_price * oi.quantity) AS revenue,
           SUM(COALESCE(oi.cost_price_snapshot, pv.cost_price, 0) * oi.quantity) AS cogs
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ('completed', 'partially_refunded')
    GROUP BY DATE(o.created_at) ORDER BY date
  `, [from, to]);

  const [byProduct] = await db.query(`
    SELECT p.name AS product_name, pv.variant_label,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.unit_price * oi.quantity) AS revenue,
           SUM(COALESCE(oi.cost_price_snapshot, pv.cost_price, 0) * oi.quantity) AS cogs,
           SUM(oi.unit_price * oi.quantity) - SUM(COALESCE(oi.cost_price_snapshot, pv.cost_price, 0) * oi.quantity) AS profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ('completed', 'partially_refunded')
    GROUP BY pv.id
    ORDER BY profit DESC
  `, [from, to]);

  return {
    orders,
    summary: { ...summary, gross_profit: grossProfit, margin: Math.round(margin * 100) / 100 },
    dailyTrend,
    byProduct,
  };
}

module.exports = { salesReport, creditReport, purchaseReport, stockReport, customerReport, profitReport };
