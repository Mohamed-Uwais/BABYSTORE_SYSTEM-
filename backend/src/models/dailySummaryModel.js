const db = require('../config/db');

async function getDailySummary(date) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const nextDate = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];

  // Yesterday for comparison
  const yesterday = new Date(new Date(dateStr).getTime() - 86400000).toISOString().split('T')[0];

  // 1. Sales overview
  const [[todayStats]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(grand_total), 0) AS total_revenue,
           COALESCE(AVG(grand_total), 0) AS avg_order_value
    FROM orders
    WHERE created_at >= ? AND created_at < ? AND status NOT IN ('cancelled')
  `, [dateStr, nextDate]);

  const [[yesterdayStats]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(grand_total), 0) AS total_revenue
    FROM orders
    WHERE created_at >= ? AND created_at < ? AND status NOT IN ('cancelled')
  `, [yesterday, dateStr]);

  // 2. Payment breakdown
  const [paymentBreakdown] = await db.query(`
    SELECT op.payment_method, COUNT(*) AS count, COALESCE(SUM(op.amount), 0) AS total
    FROM order_payments op
    JOIN orders o ON o.id = op.order_id
    WHERE o.created_at >= ? AND o.created_at < ? AND o.status NOT IN ('cancelled')
    GROUP BY op.payment_method
  `, [dateStr, nextDate]);

  // 3. Top items sold
  const [itemsSold] = await db.query(`
    SELECT p.name AS product_name, pv.variant_label, pv.sku,
           SUM(oi.quantity) AS qty_sold, SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE o.created_at >= ? AND o.created_at < ? AND o.status NOT IN ('cancelled')
    GROUP BY pv.id
    ORDER BY qty_sold DESC
    LIMIT 10
  `, [dateStr, nextDate]);

  // 4. New customers
  const [newCustomers] = await db.query(`
    SELECT id, full_name, phone, customer_type
    FROM customers
    WHERE created_at >= ? AND created_at < ?
  `, [dateStr, nextDate]);

  // 5. Returns/refunds
  const [[refundStats]] = await db.query(`
    SELECT COUNT(*) AS count, COALESCE(SUM(refund_amount), 0) AS total
    FROM order_returns
    WHERE created_at >= ? AND created_at < ?
  `, [dateStr, nextDate]);

  // 6. Credit activity
  const [[creditIssued]] = await db.query(`
    SELECT COALESCE(SUM(credit_delta), 0) AS total
    FROM customer_ledger
    WHERE entry_type = 'credit_issued' AND created_at >= ? AND created_at < ?
  `, [dateStr, nextDate]);

  const [[creditRepaid]] = await db.query(`
    SELECT COALESCE(SUM(ABS(credit_delta)), 0) AS total
    FROM customer_ledger
    WHERE entry_type = 'credit_repayment' AND created_at >= ? AND created_at < ?
  `, [dateStr, nextDate]);

  // 7. Stock alerts (items that crossed threshold today)
  const [stockAlerts] = await db.query(`
    SELECT pv.id, pv.sku, pv.variant_label, pv.current_stock, pv.low_stock_threshold,
           p.name AS product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = 1 AND pv.low_stock_threshold IS NOT NULL
      AND pv.current_stock <= pv.low_stock_threshold
    ORDER BY pv.current_stock ASC
    LIMIT 20
  `);

  // 8. Staff activity
  const [staffActivity] = await db.query(`
    SELECT u.full_name, u.username, COUNT(o.id) AS orders_count,
           COALESCE(SUM(o.grand_total), 0) AS total_sales
    FROM orders o
    JOIN users u ON u.id = o.cashier_id
    WHERE o.created_at >= ? AND o.created_at < ? AND o.status NOT IN ('cancelled')
    GROUP BY u.id
    ORDER BY orders_count DESC
  `, [dateStr, nextDate]);

  const revenueChange = Number(yesterdayStats.total_revenue) > 0
    ? ((Number(todayStats.total_revenue) - Number(yesterdayStats.total_revenue)) / Number(yesterdayStats.total_revenue) * 100)
    : null;

  return {
    date: dateStr,
    sales: {
      total_orders: todayStats.total_orders,
      total_revenue: Number(todayStats.total_revenue),
      avg_order_value: Number(todayStats.avg_order_value),
      yesterday_orders: yesterdayStats.total_orders,
      yesterday_revenue: Number(yesterdayStats.total_revenue),
      revenue_change: revenueChange !== null ? Number(revenueChange.toFixed(1)) : null,
    },
    payments: paymentBreakdown.map(p => ({ ...p, total: Number(p.total) })),
    items_sold: itemsSold.map(i => ({ ...i, revenue: Number(i.revenue) })),
    new_customers: newCustomers,
    refunds: { count: refundStats.count, total: Number(refundStats.total) },
    credit: {
      issued: Number(creditIssued.total),
      repaid: Number(creditRepaid.total),
      net_change: Number(creditIssued.total) - Number(creditRepaid.total),
    },
    stock_alerts: stockAlerts,
    staff: staffActivity.map(s => ({ ...s, total_sales: Number(s.total_sales) })),
  };
}

module.exports = { getDailySummary };
