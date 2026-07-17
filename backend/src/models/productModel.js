const db = require('../config/db');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getAllProducts() {
  const [rows] = await db.query(`
    SELECT
      p.id, p.name, p.description, p.category_id, c.name AS category_name,
      p.brand_id, b.name AS brand_name, p.is_active,
      pv.id AS variant_id, pv.sku, pv.barcode, pv.variant_label,
      pv.retail_price, pv.wholesale_price, pv.cost_price, pv.mrp,
      pv.current_stock, pv.image_url, pv.low_stock_threshold,
      pv.weight_grams
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    WHERE p.is_active = TRUE
    ORDER BY p.name ASC
  `);

  const productIds = [...new Set(rows.map(r => r.id))];
  let tagMap = {};
  if (productIds.length) {
    const [tagRows] = await db.query(
      `SELECT pt.product_id, t.id AS tag_id, t.name AS tag_name
       FROM product_tags pt JOIN tags t ON t.id = pt.tag_id
       WHERE pt.product_id IN (?)`,
      [productIds]
    );
    for (const t of tagRows) {
      if (!tagMap[t.product_id]) tagMap[t.product_id] = [];
      tagMap[t.product_id].push({ id: t.tag_id, name: t.tag_name });
    }
  }

  // Fetch price tiers for all variants
  const variantIds = rows.map(r => r.variant_id).filter(Boolean);
  let tierMap = {};
  if (variantIds.length) {
    const [tierRows] = await db.query(
      `SELECT * FROM variant_price_tiers WHERE variant_id IN (?) ORDER BY min_quantity ASC`,
      [variantIds]
    );
    for (const t of tierRows) {
      if (!tierMap[t.variant_id]) tierMap[t.variant_id] = [];
      tierMap[t.variant_id].push(t);
    }
  }

  return rows.map(r => ({ ...r, tags: tagMap[r.id] || [], price_tiers: tierMap[r.variant_id] || [] }));
}

// Get a single product with all its variants
async function getProductById(id) {
  const [rows] = await db.query(`
    SELECT p.*, pv.*
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.id = ?
  `, [id]);
  return rows;
}

// Create a new product (parent record only, variants added separately)
async function createProduct({ category_id, brand_id, name, slug, description, low_stock_threshold }) {
  const [result] = await db.query(`
    INSERT INTO products (category_id, brand_id, name, slug, description, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [category_id, brand_id, name, slug || slugify(name), description, low_stock_threshold || 5]);
  return result.insertId;
}

// Create a product together with its variants in one transaction.
// variants: [{ sku, barcode, variant_label, cost_price, wholesale_price, retail_price, mrp,
//              discount_type, discount_value, current_stock, low_stock_threshold, image_url }]
async function createProductWithVariants({ category_id, brand_id, name, slug, description, low_stock_threshold, variants, created_by }) {
  if (!variants || !variants.length) throw new Error('Product must have at least one variant');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(`
      INSERT INTO products (category_id, brand_id, name, slug, description, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [category_id, brand_id || null, name, slug || slugify(name), description || null, low_stock_threshold || 5]);
    const productId = result.insertId;

    for (const v of variants) {
      const [vResult] = await connection.query(`
        INSERT INTO product_variants
          (product_id, sku, barcode, variant_label, image_url, cost_price, wholesale_price,
           retail_price, mrp, discount_type, discount_value, current_stock, low_stock_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [productId, v.sku, v.barcode || null, v.variant_label, v.image_url || null,
          v.cost_price || 0, v.wholesale_price || 0, v.retail_price || 0, v.mrp || null,
          v.discount_type || 'none', v.discount_value || 0,
          v.current_stock || 0, v.low_stock_threshold || null]);

      // Opening stock is a real stock event - keep the audit trail complete from day one
      if (v.current_stock > 0) {
        await connection.query(`
          INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, created_by)
          VALUES (?, ?, 'manual_adjustment', 'opening_stock', ?)
        `, [vResult.insertId, v.current_stock, created_by || null]);
      }

      if (v.price_tiers?.length) {
        for (const tier of v.price_tiers) {
          await connection.query(
            `INSERT INTO variant_price_tiers (variant_id, min_quantity, tier_price, label) VALUES (?, ?, ?, ?)`,
            [vResult.insertId, tier.min_quantity, tier.tier_price, tier.label || null]
          );
        }
      }
    }

    await connection.commit();
    return productId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateProduct(id, { category_id, brand_id, name, description, low_stock_threshold, is_active }) {
  await db.query(`
    UPDATE products
    SET category_id = ?, brand_id = ?, name = ?, description = ?, low_stock_threshold = ?, is_active = ?
    WHERE id = ?
  `, [category_id, brand_id || null, name, description || null, low_stock_threshold || 5, is_active !== false, id]);
}

async function updateVariant(variantId, {
  sku, barcode, variant_label, image_url, cost_price, wholesale_price,
  retail_price, mrp, discount_type, discount_value, low_stock_threshold, is_active,
}) {
  await db.query(`
    UPDATE product_variants
    SET sku = ?, barcode = ?, variant_label = ?, image_url = COALESCE(?, image_url),
        cost_price = ?, wholesale_price = ?, retail_price = ?, mrp = ?,
        discount_type = ?, discount_value = ?, low_stock_threshold = ?, is_active = ?
    WHERE id = ?
  `, [sku, barcode || null, variant_label, image_url || null,
      cost_price || 0, wholesale_price || 0, retail_price || 0, mrp || null,
      discount_type || 'none', discount_value || 0, low_stock_threshold || null,
      is_active !== false, variantId]);
}

// Variants at or below their effective low-stock threshold (variant override, falling back to product default)
async function getLowStockVariants() {
  const [rows] = await db.query(`
    SELECT
      pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock,
      COALESCE(pv.low_stock_threshold, p.low_stock_threshold) AS effective_threshold,
      COALESCE(pv.reorder_suggestion_qty, GREATEST(COALESCE(pv.low_stock_threshold, p.low_stock_threshold) * 2 - pv.current_stock, 0)) AS suggested_reorder_qty,
      p.name AS product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = TRUE AND p.is_active = TRUE
      AND pv.current_stock <= COALESCE(pv.low_stock_threshold, p.low_stock_threshold)
    ORDER BY pv.current_stock ASC
  `);
  return rows;
}

async function hasOrderHistory(productId) {
  const [rows] = await db.query(
    `SELECT 1 FROM order_items oi JOIN product_variants pv ON pv.id = oi.variant_id WHERE pv.product_id = ? LIMIT 1`,
    [productId]
  );
  return rows.length > 0;
}

async function hasPurchaseHistory(productId) {
  const [rows] = await db.query(
    `SELECT 1 FROM purchase_order_items poi JOIN product_variants pv ON pv.id = poi.variant_id WHERE pv.product_id = ? LIMIT 1`,
    [productId]
  );
  return rows.length > 0;
}

async function variantHasOrderHistory(variantId) {
  const [rows] = await db.query(
    `SELECT 1 FROM order_items WHERE variant_id = ? LIMIT 1`,
    [variantId]
  );
  return rows.length > 0;
}

async function variantHasPurchaseHistory(variantId) {
  const [rows] = await db.query(
    `SELECT 1 FROM purchase_order_items WHERE variant_id = ? LIMIT 1`,
    [variantId]
  );
  return rows.length > 0;
}

async function deleteProduct(id) {
  const hasSales = await hasOrderHistory(id);
  const hasPO = await hasPurchaseHistory(id);
  if (hasSales || hasPO) {
    await db.query(`UPDATE products SET is_active = FALSE WHERE id = ?`, [id]);
    await db.query(`UPDATE product_variants SET is_active = FALSE WHERE product_id = ?`, [id]);
    return 'deactivated';
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM variant_price_tiers WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)`, [id]);
    await connection.query(`DELETE FROM stock_movements WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)`, [id]);
    await connection.query(`DELETE FROM product_tags WHERE product_id = ?`, [id]);
    await connection.query(`DELETE FROM product_variants WHERE product_id = ?`, [id]);
    await connection.query(`DELETE FROM products WHERE id = ?`, [id]);
    await connection.commit();
    return 'deleted';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteVariant(variantId) {
  const hasSales = await variantHasOrderHistory(variantId);
  const hasPO = await variantHasPurchaseHistory(variantId);
  if (hasSales || hasPO) {
    await db.query(`UPDATE product_variants SET is_active = FALSE WHERE id = ?`, [variantId]);
    return 'deactivated';
  }
  await db.query(`DELETE FROM variant_price_tiers WHERE variant_id = ?`, [variantId]);
  await db.query(`DELETE FROM stock_movements WHERE variant_id = ?`, [variantId]);
  await db.query(`DELETE FROM product_variants WHERE id = ?`, [variantId]);
  return 'deleted';
}

async function getPriceTiers(variantId) {
  const [rows] = await db.query(
    'SELECT * FROM variant_price_tiers WHERE variant_id = ? ORDER BY min_quantity ASC',
    [variantId]
  );
  return rows;
}

async function savePriceTiers(variantId, tiers) {
  await db.query('DELETE FROM variant_price_tiers WHERE variant_id = ?', [variantId]);
  if (tiers?.length) {
    for (const t of tiers) {
      await db.query(
        'INSERT INTO variant_price_tiers (variant_id, min_quantity, tier_price, label) VALUES (?, ?, ?, ?)',
        [variantId, t.min_quantity, t.tier_price, t.label || null]
      );
    }
  }
}

module.exports = {
  getAllProducts, getProductById, createProduct, createProductWithVariants,
  updateProduct, updateVariant, getLowStockVariants,
  hasOrderHistory, variantHasOrderHistory, deleteProduct, deleteVariant,
  getPriceTiers, savePriceTiers,
};
