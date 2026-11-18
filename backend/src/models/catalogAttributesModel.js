const db = require('../config/db');
const validate = require('../services/catalogAttributes');
const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
async function read(categoryId, connection = db) {
  const [[row]] = await connection.query('SELECT definitions, version FROM website_category_filters WHERE category_id = ?', [categoryId]);
  return row ? { definitions:decode(row.definitions), version:row.version } : {definitions:[],version:0};
}
async function variants(categoryId) {
  const [rows] = await db.query(`SELECT pv.id, p.id AS product_id, p.name, pv.variant_label, a.attribute_values
    FROM product_variants pv JOIN products p ON p.id=pv.product_id
    LEFT JOIN website_variant_attributes a ON a.variant_id=pv.id
    WHERE p.category_id=? ORDER BY p.name, pv.variant_label`, [categoryId]);
  return rows.map(row => ({...row, attribute_values:decode(row.attribute_values)||{}}));
}
async function save(categoryId, input, expectedVersion) {
  const defs = validate.definitions(input);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[category]] = await connection.query('SELECT id FROM categories WHERE id=? FOR UPDATE', [categoryId]);
    if (!category) throw Object.assign(new Error('Category not found'), {status:404});
    const state = await read(categoryId, connection);
    if (state.version !== expectedVersion) throw Object.assign(new Error('Category filters changed. Reload before saving.'), {status:409});
    const [assigned] = await connection.query(`SELECT a.attribute_values FROM website_variant_attributes a
      JOIN product_variants pv ON pv.id=a.variant_id JOIN products p ON p.id=pv.product_id WHERE p.category_id=?`, [categoryId]);
    for (const row of assigned) validate.values(decode(row.attribute_values), defs, 'variant');
    const [productValues]=await connection.query('SELECT pc.attribute_values FROM website_product_content pc JOIN products p ON p.id=pc.product_id WHERE p.category_id=?',[categoryId]);
    for(const row of productValues)validate.values(decode(row.attribute_values),defs,'product');
    await connection.query(`INSERT INTO website_category_filters (category_id, definitions, version) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE definitions=VALUES(definitions), version=VALUES(version)`, [categoryId,JSON.stringify(defs),state.version+1]);
    await connection.commit();
    return {definitions:defs,version:state.version+1};
  } catch (error) {await connection.rollback();throw error;} finally {connection.release();}
}
async function assign(categoryId, variantId, input) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM categories WHERE id=? FOR UPDATE', [categoryId]);
    const [[variant]] = await connection.query(`SELECT pv.id FROM product_variants pv JOIN products p ON p.id=pv.product_id
      WHERE pv.id=? AND p.category_id=? FOR UPDATE`, [variantId,categoryId]);
    if (!variant) throw Object.assign(new Error('Variant not found in category'), {status:404});
    const clean = validate.values(input, (await read(categoryId,connection)).definitions,'variant');
    await connection.query(`INSERT INTO website_variant_attributes (variant_id, attribute_values) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE attribute_values=VALUES(attribute_values)`, [variantId,JSON.stringify(clean)]);
    await connection.commit();
    return clean;
  } catch (error) {await connection.rollback();throw error;} finally {connection.release();}
}
module.exports = {read,variants,save,assign};
