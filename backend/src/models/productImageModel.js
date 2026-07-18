const db = require('../config/db');

async function getImagesByProductId(productId) {
  const [rows] = await db.query(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC',
    [productId]
  );
  return rows;
}

async function getImagesByProductIds(productIds) {
  if (!productIds.length) return {};
  const [rows] = await db.query(
    'SELECT * FROM product_images WHERE product_id IN (?) ORDER BY is_primary DESC, sort_order ASC',
    [productIds]
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.product_id]) map[r.product_id] = [];
    map[r.product_id].push(r);
  }
  return map;
}

async function addImage(productId, { variant_id, image_url, sort_order, is_primary }) {
  if (is_primary) {
    await db.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [productId]);
  }
  const [result] = await db.query(
    'INSERT INTO product_images (product_id, variant_id, image_url, sort_order, is_primary) VALUES (?, ?, ?, ?, ?)',
    [productId, variant_id || null, image_url, sort_order || 0, is_primary || false]
  );
  return result.insertId;
}

async function setPrimary(imageId, productId) {
  await db.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [productId]);
  await db.query('UPDATE product_images SET is_primary = TRUE WHERE id = ?', [imageId]);
}

async function updateSortOrder(images) {
  for (const img of images) {
    await db.query('UPDATE product_images SET sort_order = ? WHERE id = ?', [img.sort_order, img.id]);
  }
}

async function deleteImage(imageId) {
  await db.query('DELETE FROM product_images WHERE id = ?', [imageId]);
}

async function deleteByProductId(productId) {
  await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
}

module.exports = {
  getImagesByProductId, getImagesByProductIds, addImage,
  setPrimary, updateSortOrder, deleteImage, deleteByProductId,
};
