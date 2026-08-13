# Production Checkout Debug - Step by Step

## You're Getting: `400 Bad Request` on `POST /api/orders/checkout`

This means the backend is rejecting your checkout payload. Let's find out exactly why.

---

## 🔍 STEP 1: Check Backend Response Message

1. Open browser: **https://pos.littora.lk**
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try to complete a checkout
5. Look for error message in console

**Copy the exact error message** (e.g., "Item 0: missing variant_id")

---

## 🔍 STEP 2: Inspect Network Request

1. Open DevTools: **F12**
2. Go to **Network** tab
3. Try checkout again
4. Look for red request: **checkout** (or find it in list)
5. Click on it
6. Go to **Response** tab
7. Read the error message carefully

**This is your first clue to what's wrong.**

---

## 🔍 STEP 3: Check Request Payload

In DevTools Network tab, click the **checkout** request:

1. Go to **Request** tab (or "Payload")
2. See what was actually sent
3. Look for:
   - Missing `items` array?
   - Missing `payments` array?
   - Invalid numbers (NaN)?
   - Empty strings?

**Copy the entire request body**

---

## 🔍 STEP 4: Validate the Payload

Open **Console** tab and paste this to test:

```javascript
// ===== PASTE IN CONSOLE =====

// Check cart
console.log('=== CART CHECK ===');
const cart = []; // YOUR CART DATA
console.log('Has items:', cart.length > 0 ? '✓' : '✗ EMPTY');

cart.forEach((item, i) => {
  console.log(`Item ${i}:`, {
    variant_id: item.variant_id || '✗ MISSING',
    quantity: item.quantity,
    qty_valid: !isNaN(item.quantity) && item.quantity > 0 ? '✓' : '✗',
    unit_price: item.unit_price,
    price_valid: !isNaN(item.unit_price) && item.unit_price >= 0 ? '✓' : '✗'
  });
});

// Check payments
console.log('=== PAYMENTS CHECK ===');
const payments = []; // YOUR PAYMENTS DATA
console.log('Has payments:', payments.length > 0 ? '✓' : '✗ EMPTY');

payments.forEach((payment, i) => {
  const amount = parseFloat(payment.amount);
  console.log(`Payment ${i}:`, {
    method: payment.method || '✗ MISSING',
    amount: payment.amount,
    amount_valid: !isNaN(amount) && amount > 0 ? '✓' : '✗ INVALID'
  });
});

// Check total match
console.log('=== TOTAL CHECK ===');
const orderTotal = 0; // YOUR ORDER TOTAL
const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
console.log('Order Total:', orderTotal);
console.log('Payment Total:', paymentTotal);
console.log('Match:', Math.abs(paymentTotal - orderTotal) < 0.5 ? '✓' : '✗ MISMATCH');

// Check auth
console.log('=== AUTH CHECK ===');
console.log('Token:', localStorage.getItem('LITTORA_token') ? '✓' : '✗ MISSING');

// ===== END PASTE =====
```

**Look at the output** - it will show exactly what's wrong.

---

## 🔍 STEP 5: Test Manually from Console

If you want to test the API call directly:

```javascript
// Get token
const token = localStorage.getItem('LITTORA_token');

// Build test payload
const testPayload = {
  channel: 'pos',
  customer_id: null,
  cashier_id: 1,
  items: [
    {
      variant_id: 1,  // Change to valid variant
      quantity: 1,
      unit_price: 5000,
      discount_amount: 0
    }
  ],
  payments: [
    {
      payment_method: 'cash',
      amount: 5000
    }
  ],
  fulfillment_type: 'pickup',
  delivery_fee: 0,
  delivery_zone_id: null,
  delivery_address: null,
  notes: null
};

// Send test request
fetch('/api/orders/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(testPayload)
})
.then(r => r.json())
.then(data => {
  console.log('Status:', data.success ? '✓ Success' : '✗ Error');
  console.log('Message:', data.message);
  console.log('Full response:', data);
});
```

**This will show you if the API is working or if something is wrong with your payload.**

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "Order must contain at least one item"
**Problem**: `items` array is empty or missing
**Fix**: 
- Verify cart has products before checkout
- Check `items` array has length > 0

### Issue: "At least one payment method is required"
**Problem**: `payments` array is empty or missing
**Fix**:
- Select a payment method before checkout
- Check `payments` array has length > 0

### Issue: "Item 0: missing variant_id"
**Problem**: Items don't have `variant_id` property
**Fix**:
- Each item must have `variant_id` (number)
- Check cart items include this field

### Issue: "Item 0: quantity must be a positive number (got: undefined)"
**Problem**: `quantity` is undefined, not a number, or ≤ 0
**Fix**:
```javascript
// Ensure quantity is a number
const qty = Number(item.quantity);
if (!Number.isFinite(qty) || qty <= 0) {
  console.error('Invalid quantity:', item.quantity);
}
```

### Issue: "Item 0: unit_price must be a valid number >= 0 (got: NaN)"
**Problem**: `unit_price` is NaN or invalid
**Fix**:
```javascript
// Check unit_price is valid
const price = Number(item.unit_price);
if (!Number.isFinite(price) || price < 0) {
  console.error('Invalid price:', item.unit_price);
}
```

### Issue: "Payment 0: amount must be a positive number (got: NaN)"
**Problem**: Payment amount is NaN, empty string, or invalid
**Fix**:
```javascript
// Ensure amount is a valid number
const amount = parseFloat(payment.amount);
if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Invalid amount:', payment.amount);
}
```

### Issue: "Payment total does not match order total"
**Problem**: Sum of payments ≠ order total
**Fix**:
```javascript
// Calculate totals
const paymentSum = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
const orderTotal = calculateOrderTotal(); // Your calculation

// Must match within Rs. 0.50
if (Math.abs(paymentSum - orderTotal) > 0.5) {
  console.error('Mismatch:', { paymentSum, orderTotal });
}
```

### Issue: "Variant 123 not found"
**Problem**: The variant_id doesn't exist in the database
**Fix**:
- Verify the product variant exists
- Use a valid variant_id
- Check product hasn't been deleted

### Issue: "Insufficient stock for variant 123"
**Problem**: Not enough inventory for requested quantity
**Fix**:
- Reduce quantity
- Choose different variant
- Check stock before allowing checkout

---

## 📱 COMMON PAYLOAD MISTAKES

### ❌ Wrong: String numbers
```javascript
// BAD - amount is string
{ payment_method: 'cash', amount: '5000' }

// GOOD - amount is number
{ payment_method: 'cash', amount: 5000 }
```

### ❌ Wrong: NaN values
```javascript
// BAD - results in NaN
const price = '5000'; // string
const qty = '1';      // string
const total = price * qty; // NaN!

// GOOD - convert to numbers
const price = Number('5000');
const qty = Number('1');
const total = price * qty; // 5000
```

### ❌ Wrong: Empty strings
```javascript
// BAD - empty string for amount
{ payment_method: 'cash', amount: '' }

// GOOD - valid number
{ payment_method: 'cash', amount: 5000 }
```

### ❌ Wrong: Missing required fields
```javascript
// BAD - missing quantity
{ variant_id: 1, unit_price: 5000 }

// GOOD - all fields present
{ variant_id: 1, quantity: 1, unit_price: 5000, discount_amount: 0 }
```

### ❌ Wrong: Undefined values
```javascript
// BAD
{ payment_method: undefined, amount: 5000 }

// GOOD
{ payment_method: 'cash', amount: 5000 }
```

---

## 💾 Collect Debug Info

When you encounter the error, collect this info:

1. **Browser Console Error**:
   - Open F12 → Console
   - Find the error message
   - Screenshot or copy it

2. **Network Response**:
   - Open F12 → Network
   - Click the failed "checkout" request
   - Go to Response tab
   - Copy the exact error

3. **Request Payload**:
   - Click the failed "checkout" request
   - Go to Request/Payload tab
   - Copy the payload you're sending

4. **Console Logs**:
   - Run the validation script above
   - Share the output

5. **Browser Info**:
   - What browser? Chrome/Firefox/Safari?
   - Any errors in console? (besides the 400)
   - Is token present? (`localStorage.getItem('LITTORA_token')`)

---

## 🔧 QUICK FIXES TO TRY

1. **Clear browser cache**
   - Press: **Ctrl + Shift + Delete**
   - Clear everything
   - Reload page

2. **Hard refresh**
   - Press: **Ctrl + Shift + R**
   - Forces fresh download of JS

3. **Login again**
   - Logout and login
   - Gets fresh token
   - Resets session

4. **Try different payment method**
   - Try Cash instead of Card
   - Try different combination
   - Simpler test case

5. **Try smaller order**
   - Remove all items except one
   - Try with minimum payment
   - Test basic functionality

6. **Check network**
   - Network stable?
   - Backend responding?
   - Try again in 30 seconds

---

## 📊 Test Minimal Payload

Try this bare minimum:

```javascript
const token = localStorage.getItem('LITTORA_token');

fetch('/api/orders/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    channel: 'pos',
    customer_id: null,
    cashier_id: 1,
    items: [{
      variant_id: 1,
      quantity: 1,
      unit_price: 1000,
      discount_amount: 0
    }],
    payments: [{
      payment_method: 'cash',
      amount: 1000
    }],
    fulfillment_type: 'pickup',
    delivery_fee: 0,
    delivery_zone_id: null,
    delivery_address: null,
    notes: null
  })
})
.then(r => r.json())
.then(console.log);
```

**This is the simplest valid checkout payload.**

If this works: The issue is with your actual cart/payment data.
If this fails: The backend has an issue.

---

## 🚨 If This Still Doesn't Work

You'll need backend access to debug further. Things to check:

1. **Backend logs** - What exact error is logged?
2. **Database** - Do required tables exist?
3. **Variant** - Does variant_id 1 exist in database?
4. **Permissions** - Does user have 'orders' or 'billing' permission?
5. **Node/npm versions** - Are they compatible?
6. **Environment variables** - Is JWT_SECRET set correctly?

---

## 📝 Debug Info Template

Save this when reporting the issue:

```
Frontend Error:
- Status: 400
- Endpoint: POST /api/orders/checkout
- Browser: [Chrome/Firefox/Safari]
- Backend error message: [Copy from Network Response]

Request payload:
[Copy from Network Request tab]

Console validation output:
[Run validation script, share output]

Attempted fixes:
- [ ] Cleared cache
- [ ] Hard refresh
- [ ] Logged out/in
- [ ] Tried minimal payload
- [ ] Checked token
- [ ] Checked cart items
- [ ] Checked payment amounts
```

---

## ✅ Checklist Before Checkout

- [ ] Cart has at least 1 item
- [ ] All items have `variant_id` (number)
- [ ] All items have `quantity` > 0 (number)
- [ ] All items have `unit_price` >= 0 (number)
- [ ] Payment method selected
- [ ] Payment amount is number > 0
- [ ] Payment total matches order total
- [ ] No NaN values in console
- [ ] Token in localStorage
- [ ] Browser cache cleared
- [ ] Page refreshed

---

Good luck! The error message and network response will usually tell you exactly what's wrong.
