const db = require('../config/db');

async function getSettings() {
  const [[row]] = await db.query('SELECT * FROM store_settings WHERE id = 1');
  return row || null;
}

async function updateSettings(data) {
  const fields = [
    'store_name', 'address_line1', 'address_line2', 'city',
    'phone', 'email', 'tax_id', 'currency_symbol', 'receipt_footer', 'logo_url',
  ];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(data[f]);
    }
  }
  if (sets.length === 0) return getSettings();
  await db.query(`UPDATE store_settings SET ${sets.join(', ')} WHERE id = 1`, params);
  return getSettings();
}

module.exports = { getSettings, updateSettings };
