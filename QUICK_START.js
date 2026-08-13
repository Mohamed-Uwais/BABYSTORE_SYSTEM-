#!/usr/bin/env node
/**
 * QUICK FIX - Copy & Paste Commands
 * 
 * Run these commands to get BABYSTORE-POS working
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           BABYSTORE-POS - Quick Start Guide                 ║
╚══════════════════════════════════════════════════════════════╝

OPTION 1: Automatic Startup (Recommended for Windows)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PowerShell:
  cd C:\\Users\\User\\BABYSTORE-POS
  .\\start-dev.ps1

Command Prompt:
  cd C:\\Users\\User\\BABYSTORE-POS
  start-dev.bat


OPTION 2: Manual Startup (For troubleshooting)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terminal 1 - Backend Server:
  cd C:\\Users\\User\\BABYSTORE-POS\\backend
  npm install
  npm start
  
  Expected: 🚀 Server running on http://localhost:5001

Terminal 2 - Frontend Dev Server:
  cd C:\\Users\\User\\BABYSTORE-POS\\frontend
  npm install
  npm run dev
  
  Expected: ➜  Local:   http://localhost:5173


OPTION 3: Health Check (Verify everything is running)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  cd C:\\Users\\User\\BABYSTORE-POS
  node healthcheck.js


AFTER STARTUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open browser: http://localhost:5173
2. Login with your credentials
3. Open DevTools: F12
4. Go to Console tab
5. Look for [API] and [AUTH] logs


TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error: "Failed to load resource: 400 (Bad Request)"
  → Check browser console for error details
  → Ensure cart has items and payments total matches order total

Error: "Failed to load resource: 401 (Unauthorized)"
  → Token missing or expired
  → Clear localStorage and login again:
    localStorage.removeItem('LITTORA_token');

Error: "Disconnected port object" or "Cannot connect to backend"
  → Backend server not running
  → Run: cd backend && npm start

Error: "Cannot connect to MySQL"
  → Verify MySQL is running
  → Check .env credentials: root / MU@mhd2836


API ENDPOINTS TO TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In browser console (F12):

Test authentication:
  fetch('/api/me', {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('LITTORA_token') }
  }).then(r => r.json()).then(console.log)

Test data health:
  fetch('/api/reports/data-health', {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('LITTORA_token') }
  }).then(r => r.json()).then(console.log)


DEBUG DOCUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 FIXES_SUMMARY.md         - Detailed summary of all fixes
📄 DEBUG_API_ERRORS.md      - Comprehensive troubleshooting guide
📄 start-dev.ps1            - PowerShell startup script
📄 start-dev.bat            - Batch startup script
📄 healthcheck.js           - Service health verification
📄 QUICK_START.js           - This file


IMPORTANT ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Database (backend/.env):
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=MU@mhd2836
  DB_NAME=babystore_db
  DB_PORT=3306
  PORT=5001
  NODE_ENV=development


LOGGING TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend Console [API] logs show:
  [API] POST /orders/checkout
  [API] 400 Error: { message: 'Item 0: invalid quantity' }

Backend Terminal logs show:
  [CHECKOUT] Received payload: { channel: 'pos', ... }
  [AUTH] Token verified for user: admin accessing /orders/checkout
  [CHECKOUT] Order created successfully: 12345


STILL HAVING ISSUES?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Read DEBUG_API_ERRORS.md for detailed troubleshooting
2. Check backend terminal for [CHECKOUT] or [AUTH] error logs
3. Open browser DevTools (F12) and check Console tab
4. Check Network tab to see full request/response
5. Run: node healthcheck.js to verify all services
6. Clear browser cache: Ctrl+Shift+Delete
7. Restart both backend and frontend servers

`);
