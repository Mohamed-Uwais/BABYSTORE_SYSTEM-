const db = require('../config/db');

async function salesReport({ from, to }) {
  // All orders in range for the table (excluding cancelled)
  const [orders] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.channel, o.status,
           o.fulfillment_type, o.delivery_fee, o.grand_total,
           COALESCE((SELECT SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0))
             FROM order_items oi WHERE oi.order_id = o.id), 0) AS item_revenue,
           COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
             FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
             WHERE r.order_id = o.id), 0) AS returned_revenue,
           c.full_name AS customer_name, c.phone AS customer_phone,
           u.full_name AS cashier_name,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
           (SELECT GROUP_CONCAT(DISTINCT op.payment_method) FROM order_payments op WHERE op.order_id = o.id) AS payment_methods
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = o.cashier_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status NOT IN ('cancelled', 'refunded')
    ORDER BY o.created_at DESC
  `, [from, to]);

  // KPI summary — settled orders only (completed, delivered, partially_refunded)
  const [[summary]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(sub.item_revenue - sub.returned_revenue), 0) AS total_revenue,
           COALESCE(SUM(CASE WHEN sub.fulfillment_type = 'self_delivery' THEN sub.delivery_fee ELSE 0 END), 0) AS delivery_own,
           COALESCE(SUM(CASE WHEN sub.fulfillment_type = 'courier_delivery' THEN sub.delivery_fee ELSE 0 END), 0) AS delivery_courier,
           COALESCE(SUM(sub.returned_revenue), 0) AS total_returns
    FROM (
      SELECT o.id, o.fulfillment_type, o.delivery_fee,
             COALESCE((SELECT SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0))
               FROM order_items oi WHERE oi.order_id = o.id), 0) AS item_revenue,
             COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
               FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
               WHERE r.order_id = o.id), 0) AS returned_revenue
      FROM orders o
      WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        AND o.status IN ('completed', 'delivered', 'partially_refunded')
    ) sub
  `, [from, to]);

  // Avg computed from the same settled set
  summary.avg_order_value = summary.total_orders > 0 ? summary.total_revenue / summary.total_orders : 0;

  const [[refundSummary]] = await db.query(`
    SELECT COUNT(DISTINCT r.order_id) AS refund_count,
           COALESCE(SUM(r.refund_amount), 0) AS refund_total
    FROM order_returns r
    JOIN orders o ON o.id = r.order_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ('completed', 'delivered', 'partially_refunded')
  `, [from, to]);

  return { orders, summary: { ...summary, ...refundSummary } };
}

async function creditReport() {
  const [customers] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.loyalty_tier, c.credit_balance,
           (SELECT MAX(cl.created_at) FROM customer_ledger cl WHERE cl.customer_id = c.id AND cl.entry_type = 'credit_issued') AS last_credit_date,
           (SELECT MAX(cl.created_at) FROM customer_ledger cl WHERE cl.customer_id = c.id AND cl.entry_type = 'credit_repaid') AS last_repayment_date
    FROM customers c
    WHERE c.credit_balance != 0
    ORDER BY ABS(c.credit_balance) DESC
  `);

  const [[{ total_outstanding }]] = await db.query(
    'SELECT COALESCE(SUM(ABS(credit_balance)), 0) AS total_outstanding FROM customers WHERE credit_balance != 0'
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
  // Settled statuses: completed, delivered, partially_refunded
  // In-transit: shipped, packed — shown separately, not in headline
  const SETTLED = "('completed','delivered','partially_refunded')";
  const IN_TRANSIT = "('shipped','packed')";

  // Revenue and COGS from order_items (item-level), not order-level subtotal
  const [orders] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.grand_total, o.status,
           o.fulfillment_type, o.delivery_fee,
           c.full_name AS customer_name,
           COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0) AS revenue,
           COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)), 0) AS gross_cogs,
           COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
             FROM order_returns r
             JOIN order_items oi2 ON oi2.id = r.order_item_id
             WHERE r.order_id = o.id), 0) AS returned_revenue,
           COALESCE((SELECT SUM(r.quantity * COALESCE(oi2.cost_price_snapshot, pv2.cost_price, 0))
             FROM order_returns r
             JOIN order_items oi2 ON oi2.id = r.order_item_id
             JOIN product_variants pv2 ON pv2.id = oi2.variant_id
             WHERE r.order_id = o.id AND r.restock = 1), 0) AS returned_cogs
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ${SETTLED}
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [from, to]);

  // In-transit orders (shipped/packed) — separate from headline
  const [transitOrders] = await db.query(`
    SELECT o.id, o.order_number, o.created_at, o.grand_total, o.status,
           o.fulfillment_type, o.delivery_fee,
           c.full_name AS customer_name,
           COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0) AS revenue,
           COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)), 0) AS gross_cogs
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ${IN_TRANSIT}
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [from, to]);

  for (const o of orders) {
    o.revenue = Number(o.revenue);
    o.gross_cogs = Number(o.gross_cogs);
    o.returned_revenue = Number(o.returned_revenue);
    o.returned_cogs = Number(o.returned_cogs);
    o.net_revenue = o.revenue - o.returned_revenue;
    o.cogs = o.gross_cogs - o.returned_cogs;
    o.profit = o.net_revenue - o.cogs;
  }

  // By-product breakdown — same settled statuses
  const [byProduct] = await db.query(`
    SELECT p.name AS product_name, pv.variant_label, pv.id AS variant_id,
           SUM(oi.quantity) AS gross_units,
           COALESCE((SELECT SUM(r.quantity) FROM order_returns r WHERE r.order_item_id = oi.id AND r.restock = 1), 0) AS returned_units,
           SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)) AS gross_revenue,
           SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)) AS gross_cogs
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      AND o.status IN ${SETTLED}
    GROUP BY pv.id, oi.id
    ORDER BY gross_revenue DESC
  `, [from, to]);

  const variantMap = {};
  for (const row of byProduct) {
    const vid = row.variant_id;
    if (!variantMap[vid]) {
      variantMap[vid] = { product_name: row.product_name, variant_label: row.variant_label, units_sold: 0, revenue: 0, cogs: 0, profit: 0 };
    }
    const netUnits = Number(row.gross_units) - Number(row.returned_units);
    const costPerUnit = Number(row.gross_units) > 0 ? Number(row.gross_cogs) / Number(row.gross_units) : 0;
    const pricePerUnit = Number(row.gross_units) > 0 ? Number(row.gross_revenue) / Number(row.gross_units) : 0;
    variantMap[vid].units_sold += netUnits;
    variantMap[vid].revenue += pricePerUnit * netUnits;
    variantMap[vid].cogs += costPerUnit * netUnits;
    variantMap[vid].profit += (pricePerUnit - costPerUnit) * netUnits;
  }
  const byProductFinal = Object.values(variantMap).filter(v => v.units_sold > 0).sort((a, b) => b.profit - a.profit);

  // Summary from settled orders — headline numbers
  const total_revenue = orders.reduce((s, o) => s + o.net_revenue, 0);
  const total_cogs = orders.reduce((s, o) => s + o.cogs, 0);
  const grossProfit = total_revenue - total_cogs;
  const margin = total_revenue > 0 ? (grossProfit / total_revenue * 100) : 0;
  const delivery_own = orders.filter(o => o.fulfillment_type === 'self_delivery').reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
  const delivery_courier = orders.filter(o => o.fulfillment_type === 'courier_delivery').reduce((s, o) => s + Number(o.delivery_fee || 0), 0);

  // In-transit totals
  const transit_revenue = transitOrders.reduce((s, o) => s + Number(o.revenue), 0);
  const transit_cogs = transitOrders.reduce((s, o) => s + Number(o.gross_cogs), 0);
  const transit_count = transitOrders.length;

  // Daily trend from settled orders
  const trendMap = {};
  for (const o of orders) {
    const d = new Date(o.created_at).toISOString().slice(0, 10);
    if (!trendMap[d]) trendMap[d] = { date: d, revenue: 0, cogs: 0 };
    trendMap[d].revenue += o.net_revenue;
    trendMap[d].cogs += o.cogs;
  }
  const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    orders: orders.map(o => ({ id: o.id, order_number: o.order_number, created_at: o.created_at, grand_total: o.grand_total, status: o.status, customer_name: o.customer_name, revenue: o.net_revenue, cogs: o.cogs, returned_revenue: o.returned_revenue, profit: o.profit })),
    summary: { total_revenue, total_cogs, gross_profit: grossProfit, margin: Math.round(margin * 100) / 100, delivery_own, delivery_courier, transit_revenue, transit_cogs, transit_count },
    dailyTrend,
    byProduct: byProductFinal,
  };
}

module.exports = { salesReport, creditReport, purchaseReport, stockReport, customerReport, profitReport };
