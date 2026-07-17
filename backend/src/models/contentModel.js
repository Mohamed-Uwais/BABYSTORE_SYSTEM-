const db = require('../config/db');

async function getAll() {
  const [rows] = await db.query('SELECT section_key, content, updated_at FROM website_content ORDER BY section_key');
  const map = {};
  for (const r of rows) {
    map[r.section_key] = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
  }
  return map;
}

async function getByKey(key) {
  const [[row]] = await db.query('SELECT content FROM website_content WHERE section_key = ?', [key]);
  if (!row) return null;
  return typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
}

async function upsert(key, content) {
  await db.query(
    `INSERT INTO website_content (section_key, content) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [key, JSON.stringify(content)]
  );
  return getByKey(key);
}

module.exports = { getAll, getByKey, upsert };
