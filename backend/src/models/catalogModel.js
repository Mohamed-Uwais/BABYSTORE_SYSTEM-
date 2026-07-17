const db = require('../config/db');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getAllCategories() {
  const [rows] = await db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC');
  return rows;
}

async function createCategory({ name, parent_id }) {
  const [result] = await db.query(
    'INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)',
    [name, slugify(name), parent_id || null]
  );
  const [[row]] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
  return row;
}

async function getAllBrands() {
  const [rows] = await db.query('SELECT * FROM brands WHERE is_active = TRUE ORDER BY name ASC');
  return rows;
}

async function createBrand({ name }) {
  const [result] = await db.query(
    'INSERT INTO brands (name, slug) VALUES (?, ?)',
    [name, slugify(name)]
  );
  const [[row]] = await db.query('SELECT * FROM brands WHERE id = ?', [result.insertId]);
  return row;
}

module.exports = { getAllCategories, createCategory, getAllBrands, createBrand };
