#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 2,
  });
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function getApplied(pool) {
  const [rows] = await pool.query('SELECT filename, applied_at FROM schema_migrations ORDER BY filename');
  return new Map(rows.map(r => [r.filename, r.applied_at]));
}

async function runMigrate() {
  const pool = await getPool();
  try {
    await ensureMigrationsTable(pool);
    const applied = await getApplied(pool);
    const files = getMigrationFiles();
    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅ No pending migrations.');
      return;
    }

    console.log(`📦 ${pending.length} pending migration(s):\n`);

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8').trim();
      if (!sql) { console.log(`  ⏭  ${file} (empty, skipping)`); continue; }

      console.log(`  ▶  Running ${file}...`);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(sql);
        await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        await conn.commit();
        console.log(`  ✅ ${file}`);
      } catch (err) {
        await conn.rollback();
        console.error(`  ❌ ${file} FAILED: ${err.message}`);
        process.exit(1);
      } finally {
        conn.release();
      }
    }

    console.log('\n✅ All migrations applied.');
  } finally {
    await pool.end();
  }
}

async function runStatus() {
  const pool = await getPool();
  try {
    await ensureMigrationsTable(pool);
    const applied = await getApplied(pool);
    const files = getMigrationFiles();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log('Migration Status:\n');
    for (const file of files) {
      const when = applied.get(file);
      if (when) {
        console.log(`  ✅ ${file}  (applied ${new Date(when).toISOString().slice(0, 19)})`);
      } else {
        console.log(`  ⏳ ${file}  (pending)`);
      }
    }

    const pending = files.filter(f => !applied.has(f));
    console.log(`\n${applied.size} applied, ${pending.length} pending.`);
  } finally {
    await pool.end();
  }
}

const cmd = process.argv[2];
if (cmd === 'status') {
  runStatus().catch(err => { console.error(err); process.exit(1); });
} else {
  runMigrate().catch(err => { console.error(err); process.exit(1); });
}
