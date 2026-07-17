const insightModel = require('../models/insightModel');
const dailySummaryModel = require('../models/dailySummaryModel');
const db = require('../config/db');

async function reorderPredictions(req, res) {
  try {
    const data = await insightModel.getReorderPredictions();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function deadStock(req, res) {
  try {
    const data = await insightModel.getDeadStock();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function lowStockWithSupplier(req, res) {
  try {
    const data = await insightModel.getLowStockWithSupplier();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function dailySummary(req, res) {
  try {
    const data = await dailySummaryModel.getDailySummary(req.query.date);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getOrderTimeline(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT osh.*, u.full_name AS changed_by_name
       FROM order_status_history osh
       LEFT JOIN users u ON u.id = osh.changed_by
       WHERE osh.order_id = ?
       ORDER BY osh.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateOrderStatus(req, res) {
  try {
    const { status, notes } = req.body;
    const orderId = req.params.id;
    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    await db.query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)',
      [orderId, status, req.user?.id || null, notes || null]
    );
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function getPackingQueue(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT o.id, o.order_number, o.status, o.grand_total, o.fulfillment_type,
             o.delivery_address, o.created_at,
             c.full_name AS customer_name, c.phone AS customer_phone,
             TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS minutes_ago
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.status IN ('confirmed', 'processing', 'completed')
        AND o.fulfillment_type != 'pickup'
      ORDER BY o.created_at ASC
    `);

    for (const order of rows) {
      const [items] = await db.query(
        `SELECT oi.quantity, pv.variant_label, pv.sku, p.name AS product_name
         FROM order_items oi
         JOIN product_variants pv ON pv.id = oi.variant_id
         JOIN products p ON p.id = pv.product_id
         WHERE oi.order_id = ?`, [order.id]
      );
      order.items = items;
      order.grand_total = Number(order.grand_total);
    }

    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function exportProducts(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT p.name AS product_name, pv.variant_label, pv.sku, pv.barcode,
             c.name AS category, b.name AS brand,
             pv.cost_price, pv.wholesale_price, pv.retail_price, pv.mrp,
             pv.current_stock, pv.low_stock_threshold
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE pv.is_active = 1
      ORDER BY p.name, pv.variant_label
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function exportCustomers(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT c.full_name, c.phone, c.email, c.address, c.customer_type, c.tier,
             c.loyalty_points, c.credit_balance,
             COUNT(o.id) AS total_orders,
             COALESCE(SUM(o.grand_total), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled')
      GROUP BY c.id
      ORDER BY c.full_name
    `);
    res.json({ success: true, data: rows.map(r => ({ ...r, total_spent: Number(r.total_spent) })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function exportOrders(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT o.order_number, o.created_at AS date, c.full_name AS customer_name,
             o.channel, o.status, o.subtotal, o.discount_total, o.delivery_fee, o.grand_total,
             o.fulfillment_type
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: rows.map(r => ({
      ...r, subtotal: Number(r.subtotal), discount_total: Number(r.discount_total),
      delivery_fee: Number(r.delivery_fee), grand_total: Number(r.grand_total),
    })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function importProducts(req, res) {
  const connection = await db.getConnection();
  try {
    const { products } = req.body;
    if (!products?.length) return res.status(400).json({ success: false, message: 'No products to import' });

    await connection.beginTransaction();

    let imported = 0, skipped = 0, errors = [];

    for (const row of products) {
      try {
        if (!row.product_name || !row.sku || !row.retail_price) {
          errors.push({ sku: row.sku, reason: 'Missing required fields' });
          continue;
        }

        const [[existing]] = await connection.query('SELECT id FROM product_variants WHERE sku = ?', [row.sku]);
        if (existing) {
          skipped++;
          continue;
        }

        let categoryId = null;
        if (row.category) {
          const [[cat]] = await connection.query('SELECT id FROM categories WHERE name = ?', [row.category]);
          if (cat) { categoryId = cat.id; }
          else {
            const [catResult] = await connection.query('INSERT INTO categories (name) VALUES (?)', [row.category]);
            categoryId = catResult.insertId;
          }
        }

        let brandId = null;
        if (row.brand) {
          const [[br]] = await connection.query('SELECT id FROM brands WHERE name = ?', [row.brand]);
          if (br) { brandId = br.id; }
          else {
            const [brResult] = await connection.query('INSERT INTO brands (name) VALUES (?)', [row.brand]);
            brandId = brResult.insertId;
          }
        }

        const slug = row.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let productId;
        const [[existingProduct]] = await connection.query('SELECT id FROM products WHERE slug = ?', [slug]);
        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const [pResult] = await connection.query(
            'INSERT INTO products (category_id, brand_id, name, slug, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
            [categoryId, brandId, row.product_name, slug, row.low_stock_threshold || 5]
          );
          productId = pResult.insertId;
        }

        await connection.query(
          `INSERT INTO product_variants (product_id, sku, barcode, variant_label, cost_price, wholesale_price, retail_price, mrp, current_stock, low_stock_threshold)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [productId, row.sku, row.barcode || null, row.variant_label || 'Default',
           Number(row.cost_price) || 0, Number(row.wholesale_price) || 0, Number(row.retail_price),
           row.mrp ? Number(row.mrp) : null, Number(row.current_stock) || 0,
           row.low_stock_threshold ? Number(row.low_stock_threshold) : null]
        );

        imported++;
      } catch (e) {
        errors.push({ sku: row.sku, reason: e.message });
      }
    }

    await connection.commit();
    res.json({ success: true, data: { imported, skipped, errors: errors.length, error_details: errors } });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
}

module.exports = {
  reorderPredictions, deadStock, lowStockWithSupplier, dailySummary,
  getOrderTimeline, updateOrderStatus, getPackingQueue,
  exportProducts, exportCustomers, exportOrders, importProducts,
};
