# API Error Debugging Guide

## Quick Fixes (In Order)

### 1. ✅ Start the Backend Server
```bash
cd backend
npm install  # If dependencies not installed
npm start    # Starts on http://localhost:5001
```

**Expected output:**
```
🚀 Server running on http://localhost:5001
```

### 2. ✅ Verify Authentication Token
- Open DevTools (F12) → Console
- Run: `localStorage.getItem('LITTORA_token')`
- Should return a JWT token starting with `eyJ...`
- If empty, you need to login first

### 3. ✅ Start the Frontend Dev Server
```bash
cd frontend
npm install  # If dependencies not installed
npm run dev  # Starts on http://localhost:5173
```

### 4. ✅ Verify API Connection
In DevTools Console, run:
```javascript
const client = import('./src/api/client.js');
client.then(m => m.default.get('/me')).catch(e => console.error(e));
```

Should respond with user data or 401 if not logged in.

---

## Error Messages & Fixes

### Error: `Failed to load resource: 400 (Bad Request)` on `/api/orders/checkout`

**Cause:** Missing or malformed checkout payload

**Fix:**
1. Check browser console for detailed error message
2. In Billing.jsx, verify cart items exist
3. Verify all payments are valid numbers > 0
4. Ensure payment total matches order total

**Debug in Console:**
```javascript
// Check items being sent
fetch('/api/orders/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('LITTORA_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'pos',
    customer_id: null,
    cashier_id: 1,
    items: [{variant_id: 1, quantity: 1, unit_price: 100}],
    payments: [{payment_method: 'cash', amount: 100}],
    fulfillment_type: 'pickup'
  })
}).then(r => r.json()).then(console.log);
```

---

### Error: `401 (Unauthorized)` on `/api/reports/data-health`, `/api/insights/*`, `/api/chatbot/*`

**Cause:** Missing or invalid JWT token

**Fix:**
1. Ensure you're logged in
2. Check token exists: `localStorage.getItem('LITTORA_token')`
3. If empty, login again
4. Verify token hasn't expired
5. Check Authorization header is being sent

**Verify in Network tab:**
- Open DevTools → Network tab
- Reload the page
- Click any API request
- Check Headers → Authorization header is present
- Should show: `Authorization: Bearer eyJ...`

---

### Error: `Failed to load resource: the server responded with a status of 401` on `/api/chatbot/chatbot-alerts`

**Root Cause:** Backend server not running OR permission denied

**Checklist:**
- [ ] Backend running on port 5001? (Run `npm start` in backend folder)
- [ ] User has 'reports' permission? (Check in database)
- [ ] Token is valid and not expired?

**Terminal Check:**
```bash
# Check if port 5001 is in use (Windows)
netstat -ano | findstr :5001

# If yes, backend is running. If no:
cd backend && npm start
```

---

### Error: `Attempting to use a disconnected port object`

**Cause:** Backend server crashed or not running

**Fix:**
1. Check backend terminal for errors
2. Restart backend: `npm start` in backend folder
3. Verify database connection:
   ```bash
   # In backend folder
   npm run migrate  # or check your migration/setup script
   ```

---

## Database Connection Issues

If you get database connection errors:

1. **Verify MySQL is running**
   ```bash
   # Windows Command Prompt
   # Check if MySQL service is running
   ```

2. **Test connection credentials**
   ```bash
   cd backend
   node -e "require('./src/config/db').query('SELECT 1').then(console.log).catch(console.error)"
   ```

3. **Check `.env` file**
   - DB_HOST=localhost
   - DB_USER=root
   - DB_PASSWORD=MU@mhd2836
   - DB_NAME=babystore_db
   - DB_PORT=3306

---

## Checklist Before Testing

- [ ] MySQL server running
- [ ] Backend server running on port 5001
- [ ] Frontend dev server running
- [ ] User logged in (JWT token in localStorage)
- [ ] Browser console shows no errors
- [ ] Network tab shows Authorization header

---

## Additional Debugging

### View Request/Response in Console
```javascript
// All API requests will log to console with format:
// [API] GET /orders
// [API] 200 Error: (if error)

// Check browser console (F12) for [API] logs
```

### Enable Full Error Stack Trace
Currently set to show in development mode. Check:
```javascript
// In backend error handler (already added):
error: process.env.NODE_ENV === 'development' ? error.stack : undefined
```

### Test Checkout Endpoint Directly
```bash
# Terminal/PowerShell
$token = "YOUR_JWT_TOKEN_HERE"
$body = @{
    channel = "pos"
    customer_id = $null
    cashier_id = 1
    items = @(@{variant_id=1; quantity=1; unit_price=100})
    payments = @(@{payment_method="cash"; amount=100})
    fulfillment_type = "pickup"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5001/api/orders/checkout" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body $body
```

---

## Still Having Issues?

1. Check backend logs for error messages
2. Verify all environment variables in `.env`
3. Clear browser cache and localStorage
4. Restart both servers
5. Check firewall isn't blocking port 5001
