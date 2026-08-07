const db = require('../config/db');
const fin = require('./financialEngine');

async function getSummary() {
  const revenueSubquery = fin.NET_REVENUE_SUBQUERY;

  const [[todayStats]] = await db.query(`
    SELECT COUNT(*) AS orders_today,
           COALESCE(SUM(${revenueSubquery}), 0) AS revenue_today,
           COALESCE(SUM(o.delivery_fee), 0) AS delivery_collected_today
    FROM orders o
    WHERE DATE(o.created_at) = CURDATE() AND o.status IN ${fin.SETTLED}
  `);

  const [[weekStats]] = await db.query(`
    SELECT COUNT(*) AS orders_week,
           COALESCE(SUM(${revenueSubquery}), 0) AS revenue_week,
           COALESCE(SUM(o.delivery_fee), 0) AS delivery_collected_week
    FROM orders o
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND o.status IN ${fin.SETTLED}
  `);

  const [[monthStats]] = await db.query(`
    SELECT COUNT(*) AS orders_month,
           COALESCE(SUM(${revenueSubquery}), 0) AS revenue_month,
           COALESCE(SUM(o.delivery_fee), 0) AS delivery_collected_month
    FROM orders o
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND o.status IN ${fin.SETTLED}
  `);

  const [[prevMonthStats]] = await db.query(`
    SELECT COALESCE(SUM(${revenueSubquery}), 0) AS revenue_prev_month
    FROM orders o
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
      AND o.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      AND o.status IN ${fin.SETTLED}
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

  const [courierAlerts] = await db.query(`
    SELECT c.full_name AS courier_name, c.phone AS courier_code, c.credit_balance AS outstanding,
           (SELECT COUNT(*) FROM order_deliveries od JOIN orders o ON o.id = od.order_id JOIN couriers cr ON cr.id = od.courier_id
            WHERE cr.code = LOWER(c.phone) AND od.settled = FALSE AND o.status NOT IN ('cancelled')) AS unsettled_orders,
           (SELECT MIN(o2.created_at) FROM order_deliveries od2 JOIN orders o2 ON o2.id = od2.order_id JOIN couriers cr2 ON cr2.id = od2.courier_id
            WHERE cr2.code = LOWER(c.phone) AND od2.settled = FALSE AND o2.status NOT IN ('cancelled')) AS oldest_pending
    FROM customers c WHERE c.phone IN ('KOOMBIYO', 'FARDAR') AND c.credit_balance > 0
  `);

  // Monthly COGS for gross profit
  const [[monthCogs]] = await db.query(`
    SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, 0)), 0) AS cogs
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND o.status IN ${fin.SETTLED}
  `);

  // Monthly expenses
  const [[monthExpenses]] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);

  // Break-even: avg daily gross margin over last 30 days
  const [[avgDaily]] = await db.query(`
    SELECT COUNT(DISTINCT DATE(o.created_at)) AS active_days,
           COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
           - COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, 0)), 0) AS gross_profit_30d
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND o.status IN ${fin.SETTLED}
  `);

  // Monthly fixed expenses (recurring categories)
  const [[fixedExpenses]] = await db.query(`
    SELECT COALESCE(SUM(e.amount), 0) AS total
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    WHERE ec.is_recurring = TRUE
      AND e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);

  const monthRevenue = Number(monthStats.revenue_month);
  const monthCogsVal = Number(monthCogs.cogs);
  const grossProfit = monthRevenue - monthCogsVal;
  const expensesTotal = Number(monthExpenses.total);
  const netProfit = grossProfit - expensesTotal;

  const activeDays = Number(avgDaily.active_days) || 1;
  const avgDailyGrossProfit = Number(avgDaily.gross_profit_30d) / activeDays;
  const monthlyFixed = Number(fixedExpenses.total);
  const breakEvenDailySales = avgDailyGrossProfit > 0
    ? Math.ceil(monthlyFixed / (avgDailyGrossProfit / monthRevenue * activeDays) * activeDays / activeDays)
    : null;
  const grossMarginPct = monthRevenue > 0 ? avgDailyGrossProfit / (monthRevenue / activeDays) : 0;
  const breakEvenDaily = grossMarginPct > 0 ? Math.ceil((monthlyFixed / 30) / grossMarginPct) : null;

  return {
    today: { orders: todayStats.orders_today, revenue: Number(todayStats.revenue_today), delivery_collected: Number(todayStats.delivery_collected_today) },
    week: { orders: weekStats.orders_week, revenue: Number(weekStats.revenue_week), delivery_collected: Number(weekStats.delivery_collected_week) },
    month: { orders: monthStats.orders_month, revenue: Number(monthStats.revenue_month), delivery_collected: Number(monthStats.delivery_collected_month), revenue_growth: revenueGrowth ? Number(revenueGrowth) : null },
    profitability: {
      revenue: monthRevenue,
      cogs: monthCogsVal,
      gross_profit: grossProfit,
      gross_margin: monthRevenue > 0 ? Math.round(grossProfit / monthRevenue * 10000) / 100 : 0,
      expenses: expensesTotal,
      net_profit: netProfit,
      net_margin: monthRevenue > 0 ? Math.round(netProfit / monthRevenue * 10000) / 100 : 0,
      break_even_daily: breakEvenDaily,
    },
    customers: customerCount.total,
    active_products: productCount.total,
    low_stock_count: lowStockCount.total,
    refunds_month: { count: refundStats.refunds_month, total: Number(refundStats.refund_total_month) },
    courier_alerts: courierAlerts.map(a => ({
      courier_name: a.courier_name,
      courier_code: a.courier_code,
      outstanding: Number(a.outstanding),
      unsettled_orders: a.unsettled_orders,
      days_pending: a.oldest_pending ? Math.floor((Date.now() - new Date(a.oldest_pending).getTime()) / 86400000) : 0,
    })),
  };
}

async function getSalesChart(days = 30) {
  const [rows] = await db.query(`
    SELECT DATE(o.created_at) AS date,
           COUNT(*) AS orders,
           COALESCE(SUM(${fin.NET_REVENUE_SUBQUERY}), 0) AS revenue,
           COALESCE(SUM(o.delivery_fee), 0) AS delivery_collected
    FROM orders o
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND o.status IN ${fin.SETTLED}
    GROUP BY DATE(o.created_at)
    ORDER BY date
  `, [days]);

  return rows.map(r => ({ date: r.date, orders: r.orders, revenue: Number(r.revenue), delivery_collected: Number(r.delivery_collected) }));
}

async function getBestSellers(limit = 10) {
  return fin.bestSellersQuery('o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)', [], limit);
}

async function getStaffPerformance() {
  return fin.staffSalesQuery('o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)', []);
}

async function getCustomerInsights() {
  const [topCustomers] = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.customer_type,
           COUNT(DISTINCT o.id) AS orders_count,
           COALESCE(SUM(${fin.NET_REVENUE_SUBQUERY}), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.status IN ${fin.SETTLED}
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
      AND o.status IN ${fin.SETTLED}
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
