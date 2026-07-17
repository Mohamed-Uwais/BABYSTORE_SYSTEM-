const db = require('../config/db');

async function getAllTags() {
  const [rows] = await db.query('SELECT * FROM tags ORDER BY name');
  return rows;
}

async function createTag({ name }) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const [result] = await db.query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name.trim(), slug]);
  return { id: result.insertId, name: name.trim(), slug };
}

async function deleteTag(id) {
  await db.query('DELETE FROM tags WHERE id = ?', [id]);
}

async function getProductTags(productId) {
  const [rows] = await db.query(
    'SELECT t.* FROM tags t JOIN product_tags pt ON pt.tag_id = t.id WHERE pt.product_id = ? ORDER BY t.name',
    [productId]
  );
  return rows;
}

async function setProductTags(productId, tagIds) {
  await db.query('DELETE FROM product_tags WHERE product_id = ?', [productId]);
  if (tagIds && tagIds.length > 0) {
    const values = tagIds.map(tid => [productId, tid]);
    await db.query('INSERT INTO product_tags (product_id, tag_id) VALUES ?', [values]);
  }
}

module.exports = { getAllTags, createTag, deleteTag, getProductTags, setProductTags };
