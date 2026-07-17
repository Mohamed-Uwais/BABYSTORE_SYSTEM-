const db = require('../config/db');

async function getProducts({ category, brand, minPrice, maxPrice, inStock, onSale, sort, search, limit = 24, offset = 0 }) {
  let where = 'p.is_active = TRUE AND pv.is_active = TRUE';
  const params = [];

  if (category) { where += ' AND c.name = ?'; params.push(category); }
  if (brand) { where += ' AND b.name = ?'; params.push(brand); }
  if (minPrice) { where += ' AND pv.retail_price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { where += ' AND pv.retail_price <= ?'; params.push(Number(maxPrice)); }
  if (inStock === 'true') { where += ' AND pv.current_stock > 0'; }
  if (onSale === 'true') { where += " AND pv.discount_type != 'none' AND pv.discount_value > 0"; }
  if (search) {
    where += ' AND (p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ? OR pv.sku LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = 'pv.retail_price ASC';
  else if (sort === 'price_desc') orderBy = 'pv.retail_price DESC';
  else if (sort === 'best_selling') orderBy = 'units_sold DESC';
  else if (sort === 'newest') orderBy = 'p.created_at DESC';

  const countSQL = `
    SELECT COUNT(DISTINCT p.id) AS total
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE ${where}
  `;
  const [[{ total }]] = await db.query(countSQL, params);

  const dataSQL = `
    SELECT
      p.id, p.name, p.slug, p.description,
      c.name AS category_name, b.name AS brand_name,
      MIN(pv.id) AS variant_id,
      MIN(pv.variant_label) AS variant_label,
      MIN(pv.retail_price) AS retail_price,
      MIN(pv.image_url) AS image_url,
      MAX(CASE WHEN pv.current_stock > 0 THEN 1 ELSE 0 END) AS in_stock,
      COUNT(pv.id) AS variant_count,
      MAX(CASE WHEN pv.discount_type != 'none' AND pv.discount_value > 0 THEN 1 ELSE 0 END) AS on_sale,
      MAX(CASE
        WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
        WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
        ELSE pv.retail_price
      END) AS max_price,
      MIN(CASE
        WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
        WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
        ELSE pv.retail_price
      END) AS min_discounted_price,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE oi.variant_id = MIN(pv.id)
                AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND o.status = 'completed'), 0) AS units_sold,
      (SELECT COUNT(*) > 0 FROM variant_price_tiers vpt WHERE vpt.variant_id = MIN(pv.id)) AS has_tiers
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [products] = await db.query(dataSQL, [...params, Number(limit), Number(offset)]);

  return { products, total, limit: Number(limit), offset: Number(offset) };
}

async function getProductBySlug(slug) {
  const [[product]] = await db.query(`
    SELECT p.id, p.name, p.slug, p.description,
           c.name AS category_name, b.name AS brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.slug = ? AND p.is_active = TRUE
  `, [slug]);
  if (!product) return null;

  const [variants] = await db.query(`
    SELECT id, variant_label, retail_price, image_url, current_stock,
           discount_type, discount_value,
           CASE
             WHEN discount_type = 'percent' THEN ROUND(retail_price * (1 - discount_value / 100), 2)
             WHEN discount_type = 'amount' THEN GREATEST(retail_price - discount_value, 0)
             ELSE retail_price
           END AS discounted_price,
           CASE WHEN current_stock > 0 THEN TRUE ELSE FALSE END AS in_stock,
           CASE WHEN current_stock > 0 AND current_stock < 10 THEN current_stock ELSE NULL END AS low_stock_warning
    FROM product_variants
    WHERE product_id = ? AND is_active = TRUE
    ORDER BY retail_price ASC
  `, [product.id]);

  // Fetch price tiers for all variants
  const variantIds = variants.map(v => v.id);
  let tierMap = {};
  if (variantIds.length) {
    const [tierRows] = await db.query(
      'SELECT * FROM variant_price_tiers WHERE variant_id IN (?) ORDER BY min_quantity ASC',
      [variantIds]
    );
    for (const t of tierRows) {
      if (!tierMap[t.variant_id]) tierMap[t.variant_id] = [];
      tierMap[t.variant_id].push(t);
    }
  }
  for (const v of variants) {
    v.price_tiers = tierMap[v.id] || [];
  }

  const [tags] = await db.query(`
    SELECT t.id, t.name FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = ?
  `, [product.id]);

  const [related] = await db.query(`
    SELECT p.id, p.name, p.slug, b.name AS brand_name,
           MIN(pv.retail_price) AS retail_price,
           MIN(pv.image_url) AS image_url,
           MAX(CASE WHEN pv.current_stock > 0 THEN 1 ELSE 0 END) AS in_stock
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.category_id = (SELECT category_id FROM products WHERE id = ?)
      AND p.id != ? AND p.is_active = TRUE AND pv.is_active = TRUE
    GROUP BY p.id
    ORDER BY RAND()
    LIMIT 4
  `, [product.id, product.id]);

  return { ...product, variants, tags, related };
}

async function getCategories() {
  const [rows] = await db.query(`
    SELECT c.id, c.name, COUNT(DISTINCT p.id) AS product_count
    FROM categories c
    JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.name
  `);
  return rows;
}

async function getBrands() {
  const [rows] = await db.query(`
    SELECT b.id, b.name, COUNT(DISTINCT p.id) AS product_count
    FROM brands b
    JOIN products p ON p.brand_id = b.id AND p.is_active = TRUE
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    GROUP BY b.id
    ORDER BY b.name
  `);
  return rows;
}

async function getBestSellers(limit = 8) {
  const [rows] = await db.query(`
    SELECT p.id, p.name, p.slug, b.name AS brand_name,
           pv.retail_price, pv.image_url,
           pv.discount_type, pv.discount_value,
           CASE
             WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
             WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
             ELSE pv.retail_price
           END AS discounted_price,
           CASE WHEN pv.current_stock > 0 THEN TRUE ELSE FALSE END AS in_stock,
           SUM(oi.quantity) AS units_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN product_variants pv ON pv.id = oi.variant_id AND pv.is_active = TRUE
    JOIN products p ON p.id = pv.product_id AND p.is_active = TRUE
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND o.status = 'completed'
    GROUP BY pv.id
    ORDER BY units_sold DESC
    LIMIT ?
  `, [limit]);

  if (rows.length < 4) {
    const [fallback] = await db.query(`
      SELECT p.id, p.name, p.slug, b.name AS brand_name,
             MIN(pv.retail_price) AS retail_price, MIN(pv.image_url) AS image_url,
             MAX(CASE WHEN pv.current_stock > 0 THEN 1 ELSE 0 END) AS in_stock,
             'none' AS discount_type, 0 AS discount_value, MIN(pv.retail_price) AS discounted_price,
             0 AS units_sold
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [limit]);
    return fallback;
  }
  return rows;
}

async function getNewArrivals(limit = 8) {
  const [rows] = await db.query(`
    SELECT p.id, p.name, p.slug, b.name AS brand_name,
           MIN(pv.retail_price) AS retail_price, MIN(pv.image_url) AS image_url,
           MAX(CASE WHEN pv.current_stock > 0 THEN 1 ELSE 0 END) AS in_stock,
           MIN(CASE
             WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
             WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
             ELSE pv.retail_price
           END) AS discounted_price,
           MAX(CASE WHEN pv.discount_type != 'none' AND pv.discount_value > 0 THEN 1 ELSE 0 END) AS on_sale
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.is_active = TRUE
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ?
  `, [limit]);
  return rows;
}

async function trackOrder(orderNumber, phone) {
  const [[order]] = await db.query(`
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount_total,
           o.delivery_fee, o.grand_total, o.fulfillment_type, o.created_at,
           c.full_name AS customer_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.order_number = ?
      AND (c.phone = ? OR (o.customer_id IS NULL AND ? = ''))
  `, [orderNumber, phone, phone]);
  if (!order) return null;

  const [items] = await db.query(`
    SELECT p.name AS product_name, pv.variant_label, oi.quantity, oi.unit_price, oi.line_total
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE oi.order_id = ?
  `, [order.id]);

  const [payments] = await db.query('SELECT payment_method, amount FROM order_payments WHERE order_id = ?', [order.id]);

  const [delivery] = await db.query(`
    SELECT od.tracking_number, od.delivery_status, od.receiver_name, od.receiver_phone,
           cr.name AS courier_name, cr.tracking_url_template
    FROM order_deliveries od
    LEFT JOIN couriers cr ON cr.id = od.courier_id
    WHERE od.order_id = ?
  `, [order.id]);

  const [history] = await db.query(`
    SELECT status, notes, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC
  `, [order.id]);

  return { ...order, items, payments, delivery: delivery[0] || null, history };
}

async function getStoreInfo() {
  const [[info]] = await db.query(`
    SELECT store_name, address_line1, address_line2, city, phone, email, logo_url, receipt_footer
    FROM store_settings WHERE id = 1
  `);
  return info || {};
}

async function getDeliveryZones() {
  const [rows] = await db.query('SELECT id, zone_name, base_fee FROM delivery_zones ORDER BY zone_name');
  return rows;
}

async function saveContact({ name, phone, email, message }) {
  const [result] = await db.query(
    'INSERT INTO contact_messages (name, phone, email, message) VALUES (?, ?, ?, ?)',
    [name, phone || null, email || null, message]
  );
  return result.insertId;
}

// Blog
async function getBlogPosts({ limit = 12, offset = 0 } = {}) {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM blog_posts WHERE is_published = 1');
  const [posts] = await db.query(`
    SELECT id, title, slug, excerpt, cover_image_url AS cover_image, meta_description, created_at,
           CEIL(CHAR_LENGTH(content) / 1000) AS read_time_min
    FROM blog_posts
    WHERE is_published = 1
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [Number(limit), Number(offset)]);
  return { posts, total };
}

async function getBlogPostBySlug(slug) {
  const [[post]] = await db.query(`
    SELECT id, title, slug, content, excerpt, cover_image_url AS cover_image, meta_description, created_at,
           CEIL(CHAR_LENGTH(content) / 1000) AS read_time_min
    FROM blog_posts
    WHERE slug = ? AND is_published = 1
  `, [slug]);
  return post || null;
}

module.exports = {
  getProducts, getProductBySlug, getCategories, getBrands,
  getBestSellers, getNewArrivals, trackOrder, getStoreInfo,
  getDeliveryZones, saveContact, getBlogPosts, getBlogPostBySlug,
};
