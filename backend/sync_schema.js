#!/usr/bin/env node
// Schema sync script — run on VPS:
//   cd /var/www/babystore/backend && node sync_schema.js
// Compares local schema (from sync_data.json) with VPS, runs CREATE/ALTER only.
// DOES NOT touch any data.

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync_data.json'), 'utf8'));
const LOCAL_CREATES = DATA.creates;
const LOCAL_COLUMNS = DATA.schema;

(async () => {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'babystore_db',
  });

  console.log('Connected to MySQL');
  const summary = [];

  const [vpsTables] = await db.query('SHOW TABLES');
  const key = Object.keys(vpsTables[0])[0];
  const vpsTableNames = new Set(vpsTables.map(t => t[key]));

  // 1. Create missing tables (retry loop for FK dependencies)
  const missingTables = Object.keys(LOCAL_CREATES).filter(t => !vpsTableNames.has(t));
  let retries = missingTables.slice();
  let lastLen = -1;
  while (retries.length > 0 && retries.length !== lastLen) {
    lastLen = retries.length;
    const failed = [];
    for (const table of retries) {
      console.log('Creating missing table:', table);
      try {
        await db.query(LOCAL_CREATES[table]);
        summary.push('Created table: ' + table);
      } catch (err) {
        console.log('  Deferred:', err.message.substring(0, 80));
        failed.push(table);
      }
    }
    retries = failed;
  }
  for (const table of retries) {
    summary.push('FAILED to create table: ' + table);
  }

  // 2. Add missing columns to existing tables
  for (const table of Object.keys(LOCAL_COLUMNS)) {
    if (missingTables.includes(table)) continue;

    const [vpsCols] = await db.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [process.env.DB_NAME || 'babystore_db', table]
    );
    const vpsColSet = new Set(vpsCols.map(c => c.COLUMN_NAME));

    for (const col of LOCAL_COLUMNS[table]) {
      if (!vpsColSet.has(col)) {
        const re = new RegExp('^\\s*`' + col + '`\\s+(.+?)\\s*,?\\s*$', 'm');
        const m = LOCAL_CREATES[table].match(re);
        if (m) {
          const def = m[1].replace(/,\s*$/, '');
          const sql = 'ALTER TABLE `' + table + '` ADD COLUMN `' + col + '` ' + def;
          console.log('Running:', sql);
          try {
            await db.query(sql);
            summary.push('Added column: ' + table + '.' + col);
          } catch (err) {
            console.error('  ERROR:', err.message);
            summary.push('FAILED ' + table + '.' + col + ': ' + err.message);
          }
        }
      }
    }
  }

  console.log('');
  console.log('=== SYNC SUMMARY ===');
  if (summary.length === 0) {
    console.log('Schema already in sync! No changes needed.');
  } else {
    summary.forEach(s => console.log(' ', s));
  }
  console.log('Total changes:', summary.length);
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
