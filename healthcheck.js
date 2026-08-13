#!/usr/bin/env node

/**
 * Health Check Script for BABYSTORE-POS
 * Run: node healthcheck.js
 * 
 * Verifies:
 * - MySQL database connection
 * - Backend server status
 * - Frontend dev server status
 * - Authentication token (if running in browser context)
 */

const http = require('http');
const mysql = require('mysql2/promise');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(status, message, details = '') {
  const icon = status === 'ok' ? '✓' : status === 'error' ? '✗' : 'ℹ';
  const color = status === 'ok' ? colors.green : status === 'error' ? colors.red : colors.yellow;
  console.log(`${color}${icon}${colors.reset} ${message}${details ? ' ' + details : ''}`);
}

async function checkMySQL() {
  console.log(`\n${colors.cyan}=== MySQL Database ===${colors.reset}`);
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'MU@mhd2836',
      database: 'babystore_db'
    });
    
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    await connection.end();
    
    log('ok', 'MySQL Connection', `(${rows[0].count} users found)`);
    return true;
  } catch (error) {
    log('error', 'MySQL Connection', `- ${error.message}`);
    log('info', 'Make sure MySQL is running with correct credentials');
    return false;
  }
}

function checkServer(name, host, port) {
  return new Promise((resolve) => {
    console.log(`\n${colors.cyan}=== ${name} ===${colors.reset}`);
    const req = http.get(`http://${host}:${port}/`, (res) => {
      log('ok', `${name} Server`, `(status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      log('error', `${name} Server`, `- ${error.message}`);
      log('info', `Make sure ${name} is running on ${host}:${port}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      log('error', `${name} Server`, '- Connection timeout');
      resolve(false);
    });
  });
}

async function main() {
  console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     BABYSTORE-POS Health Check        ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  
  const mysqlOk = await checkMySQL();
  const backendOk = await checkServer('Backend', 'localhost', 5001);
  const frontendOk = await checkServer('Frontend', 'localhost', 5173);
  
  console.log(`\n${colors.cyan}=== Summary ===${colors.reset}`);
  
  if (mysqlOk && backendOk && frontendOk) {
    log('ok', 'All systems operational!');
    console.log(`\n${colors.green}Frontend: http://localhost:5173${colors.reset}`);
    console.log(`${colors.green}Backend: http://localhost:5001${colors.reset}`);
    console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Login with your credentials');
    console.log('3. Check browser console (F12) for [API] logs');
  } else {
    log('error', 'Some services are not running');
    console.log(`\n${colors.yellow}Failed services:${colors.reset}`);
    if (!mysqlOk) console.log('  - MySQL Database');
    if (!backendOk) console.log('  - Backend Server');
    if (!frontendOk) console.log('  - Frontend Dev Server');
    
    console.log(`\n${colors.yellow}To fix:${colors.reset}`);
    if (!mysqlOk) console.log('  - Start MySQL service');
    if (!backendOk) console.log('  - Run: cd backend && npm start');
    if (!frontendOk) console.log('  - Run: cd frontend && npm run dev');
  }
  
  console.log('');
}

main().catch(console.error);
