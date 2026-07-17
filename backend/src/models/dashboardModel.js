const db = require('../config/db');

async function getSummary() {
  const [[todayStats]] = await db.query(`
    SELECT COUNT(*) AS orders_today,
           COALESCE(SUM(grand_total), 0) AS revenue_today
    FROM orders
    WHERE DATE(created_at) = CURDATE() AND status NOT IN ('cancelled')
  `);

  const [[weekStats]] = await db.query(`
    SELECT COUNT(*) AS orders_week,
           COALESCE(SUM(grand_total), 0) AS revenue_week
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('cancelled')
  `);

  const [[monthStats]] = await db.query(`
    SELECT COUNT(*) AS orders_month,
           COALESCE(SUM(grand_total), 0) AS revenue_month
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status NOT IN ('cancelled')
  `);

  const [[prevMonthStats]] = await db.query(`
    SELECT COALESCE(SUM(grand_total), 0) AS revenue_prev_month
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      AND status NOT IN ('cancelled')
  `);

  const [[customerCount]] = await db.query('SELECT COUNT(*) AS total FROM customers');
  const [[productCount]] = await db.query('SELECT COUNT(*) AS total FROM product_variants WHERE is_active = 1');

  const [[lowStockCount]] = await db.query(`
    SELECT COUNT(*) AS total FROM product_variants
    WHERE is_active = 1 AND low_stock_threshold IS NOT NULL AND current_stock <= low_stock_threshold
  `);

  const [[refundStats]] = await db.query(`
    SELECT COUNT(*) AS refunds_month,
           COALESCE(SUM(refund_amount), 0) AS refund_total_month
    FROM order_returns
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);

  const revenueGrowth = prevMonthStats.revenue_prev_month > 0
    ? ((monthStats.revenue_month - prevMonthStats.revenue_prev_month) / prevMonthStats.revenue_prev_month * 100).toFixed(1)
    : null;

  return {
    today: { orders: todayStats.orders_today, revenue: Number(todayStats.revenue_today) },
    week: { orders: weekStats.orders_week, revenue: Number(weekStats.revenue_week) },
    month: { orders: monthStats.orders_month, revenue: Number(monthStats.revenue_month), revenue_growth: revenueGrowth ? Number(revenueGrowth) : null },
    customers: customerCount.total,
    active_products: productCount.total,
    low_stock_count: lowStockCount.total,
    refunds_month: { count: refundStats.refunds_month, total: Number(refundStats.refund_total_month) },
  };
}

async function getSalesChart(days = 30) {
  const [rows] = await db.query(`
    SELECT DATE(created_at) AS date,
           COUNT(*) AS orders,
           COALESCE(SUM(grand_total), 0) AS revenue
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND status NOT IN ('cancelled')
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [days]);

  return rows.map(r => ({ date: r.date, orders: r.orders, revenue: Number(r.revenue) }));
}

async function getBestSellers(limit = 10) {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.retail_price, pv.current_stock,
           p.name AS product_name, pv.image_url,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      AND o.status NOT IN ('cancelled')
    GROUP BY pv.id
    ORDER BY units_sold DESC
    LIMIT ?
  `, [limit]);

  return rows.map(r => ({ ...r, retail_price: Number(r.retail_price), revenue: Number(r.revenue) }));
}

async function getStaffPerformance() {
  const [rows] = await db.query(`
    SELECT u.id, u.full_name, u.username, u.role,
           COUNT(o.id) AS orders_count,
           COALESCE(SUM(o.grand_total), 0) AS total_sales
    FROM users u
    LEFT JOIN orders o ON o.cashier_id = u.id
      AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      AND o.status NOT IN ('cancelled')
    GROUP BY u.id
    ORDER BY total_sales DESC
  `);

  return rows.map(r => ({ ...r, total_sales: Number(r.total_sales) }));
}

async function getCustomerInsights() {
  const [topCustomers] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.customer_type,
           COUNT(o.id) AS orders_count,
           COALESCE(SUM(o.grand_total), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled')
    GROUP BY c.id
    ORDER BY total_spent DESC
    LIMIT 10
  `);

  const [[typeBreakdown]] = await db.query(`
    SELECT
      SUM(customer_type = 'walk_in') AS walk_in,
      SUM(customer_type = 'regular') AS regular,
      SUM(customer_type = 'loyalty') AS loyalty
    FROM customers
  `);

  return {
    top_customers: topCustomers.map(c => ({ ...c, total_spent: Number(c.total_spent) })),
    type_breakdown: {
      walk_in: Number(typeBreakdown.walk_in || 0),
      regular: Number(typeBreakdown.regular || 0),
      loyalty: Number(typeBreakdown.loyalty || 0),
    },
  };
}

async function getLowStock() {
  const [rows] = await db.query(`
    SELECT pv.id, pv.sku, pv.variant_label, pv.current_stock, pv.low_stock_threshold,
           pv.reorder_suggestion_qty, pv.retail_price, p.name AS product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = 1 AND pv.low_stock_threshold IS NOT NULL
      AND pv.current_stock <= pv.low_stock_threshold
    ORDER BY CAST(pv.current_stock AS SIGNED) - CAST(pv.low_stock_threshold AS SIGNED) ASC
  `);

  return rows.map(r => ({ ...r, retail_price: Number(r.retail_price) }));
}

async function getPaymentMethodBreakdown() {
  const [rows] = await db.query(`
    SELECT op.payment_method, COUNT(*) AS count, COALESCE(SUM(op.amount), 0) AS total
    FROM order_payments op
    JOIN orders o ON o.id = op.order_id
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      AND o.status NOT IN ('cancelled')
    GROUP BY op.payment_method
    ORDER BY total DESC
  `);

  return rows.map(r => ({ ...r, total: Number(r.total) }));
}

async function getRecentOrders(limit = 10) {
  const [rows] = await db.query(`
    SELECT o.id, o.order_number, o.status, o.grand_total, o.created_at,
           c.full_name AS customer_name, u.full_name AS cashier_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = o.cashier_id
    ORDER BY o.created_at DESC
    LIMIT ?
  `, [limit]);

  return rows.map(r => ({ ...r, grand_total: Number(r.grand_total) }));
}

module.exports = {
  getSummary, getSalesChart, getBestSellers, getStaffPerformance,
  getCustomerInsights, getLowStock, getPaymentMethodBreakdown, getRecentOrders,
};
