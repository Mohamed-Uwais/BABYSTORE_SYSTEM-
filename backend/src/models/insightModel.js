const db = require('../config/db');

async function getReorderPredictions() {
  const [rows] = await db.query(`
    SELECT c.id AS customer_id, c.full_name, c.phone,
           p.name AS product_name, pv.variant_label, pv.sku, pv.id AS variant_id,
           COUNT(DISTINCT o.id) AS purchase_count,
           MIN(o.created_at) AS first_purchase,
           MAX(o.created_at) AS last_purchase,
           DATEDIFF(MAX(o.created_at), MIN(o.created_at)) / GREATEST(COUNT(DISTINCT o.id) - 1, 1) AS avg_interval_days
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN customers c ON c.id = o.customer_id
    WHERE o.status NOT IN ('cancelled', 'refunded')
      AND c.customer_type = 'loyalty'
    GROUP BY c.id, pv.id
    HAVING purchase_count >= 2 AND avg_interval_days > 0
  `);

  const now = new Date();
  return rows
    .map(r => {
      const lastPurchase = new Date(r.last_purchase);
      const avgInterval = Number(r.avg_interval_days);
      const predicted = new Date(lastPurchase.getTime() + avgInterval * 86400000);
      const daysUntil = Math.round((predicted - now) / 86400000);
      return {
        customer_id: r.customer_id,
        customer_name: r.full_name,
        phone: r.phone,
        product_name: r.product_name,
        variant_label: r.variant_label,
        sku: r.sku,
        variant_id: r.variant_id,
        purchase_count: r.purchase_count,
        avg_interval_days: Math.round(avgInterval),
        last_purchase: r.last_purchase,
        predicted_reorder: predicted.toISOString().split('T')[0],
        days_until: daysUntil,
        days_overdue: daysUntil < 0 ? Math.abs(daysUntil) : 0,
      };
    })
    .filter(r => r.days_until <= 3)
    .sort((a, b) => a.days_until - b.days_until);
}

async function getDeadStock() {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock,
           pv.retail_price, pv.cost_price, p.name AS product_name, p.id AS product_id,
           COALESCE(sales.units_sold_30d, 0) AS units_sold_30d,
           COALESCE(sales.units_sold_90d, 0) AS units_sold_90d,
           COALESCE(sales.last_sale_date, pv.created_at) AS last_sale_date,
           DATEDIFF(NOW(), COALESCE(sales.last_sale_date, pv.created_at)) AS days_since_last_sale
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN (
      SELECT oi.variant_id,
             SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN oi.quantity ELSE 0 END) AS units_sold_30d,
             SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN oi.quantity ELSE 0 END) AS units_sold_90d,
             MAX(o.created_at) AS last_sale_date
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('cancelled', 'refunded')
      GROUP BY oi.variant_id
    ) sales ON sales.variant_id = pv.id
    WHERE pv.is_active = 1 AND pv.current_stock > 0
    HAVING units_sold_30d <= 2
    ORDER BY days_since_last_sale DESC
  `);

  let totalDeadValue = 0;
  const items = rows.map(r => {
    const stockValue = Number(r.current_stock) * Number(r.retail_price);
    const costValue = Number(r.current_stock) * Number(r.cost_price || 0);
    const daysOfStock = r.units_sold_90d > 0
      ? Math.round((Number(r.current_stock) / (r.units_sold_90d / 90)) )
      : 999;
    totalDeadValue += stockValue;

    let severity = 'slow';
    let suggestion = 'Reduce reorder quantity';
    if (r.units_sold_30d === 0) {
      severity = 'dead';
      suggestion = 'Consider clearance discount';
    }

    return {
      variant_id: r.variant_id,
      product_id: r.product_id,
      product_name: r.product_name,
      variant_label: r.variant_label,
      sku: r.sku,
      current_stock: r.current_stock,
      retail_price: Number(r.retail_price),
      cost_price: Number(r.cost_price || 0),
      stock_value_retail: stockValue,
      stock_value_cost: costValue,
      units_sold_30d: r.units_sold_30d,
      units_sold_90d: r.units_sold_90d,
      days_since_last_sale: r.days_since_last_sale,
      days_of_stock: daysOfStock,
      severity,
      suggestion,
    };
  });

  return { items, total_dead_value: totalDeadValue, count: items.length };
}

async function getLowStockWithSupplier() {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock,
           pv.low_stock_threshold, pv.reorder_suggestion_qty, pv.retail_price, pv.cost_price,
           p.name AS product_name, p.id AS product_id,
           last_po.supplier_id AS last_supplier_id, s.name AS last_supplier_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN (
      SELECT poi.variant_id, po.supplier_id,
             ROW_NUMBER() OVER (PARTITION BY poi.variant_id ORDER BY po.created_at DESC) AS rn
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
    ) last_po ON last_po.variant_id = pv.id AND last_po.rn = 1
    LEFT JOIN suppliers s ON s.id = last_po.supplier_id
    WHERE pv.is_active = 1 AND pv.low_stock_threshold IS NOT NULL
      AND pv.current_stock <= pv.low_stock_threshold
    ORDER BY pv.current_stock ASC
  `);

  return rows.map(r => ({
    ...r,
    retail_price: Number(r.retail_price),
    cost_price: Number(r.cost_price || 0),
    is_zero: r.current_stock === 0,
    suggested_qty: r.reorder_suggestion_qty || Math.max(10, (r.low_stock_threshold || 5) * 2),
  }));
}

module.exports = { getReorderPredictions, getDeadStock, getLowStockWithSupplier };
