# Production Checkout 400 Error - Complete Diagnosis

## Status: Need Exact Error Message to Proceed

Your production `pos.littora.lk` is returning **400 Bad Request** on checkout.  
Without the **response error message**, we can only guess.

---

## 🚨 Get Error Message NOW (Critical)

### Method 1: Network Tab (Easiest)
```
1. Go to https://pos.littora.lk
2. Press F12
3. Click "Network" tab
4. Try checkout
5. Click red "checkout" request
6. Click "Response" tab
7. COPY ERROR - should be like:
   {
     "success": false,
     "message": "EXACT ERROR HERE"
   }
```

### Method 2: Console (If Network doesn't work)
Paste in Console (F12 → Console):
```javascript
// Intercept and log checkout errors
const origFetch = window.fetch;
window.fetch = function(...a) {
  const [url, opts] = a;
  if (url?.includes('/checkout')) {
    return origFetch.apply(this, a).then(async r => {
      if (!r.ok) {
        try {
          const err = await r.json();
          console.error('🔴 CHECKOUT ERROR:', err.message);
          console.log('Full response:', err);
        } catch (e) {
          console.error('Response error:', await r.text());
        }
      }
      return r;
    });
  }
  return origFetch.apply(this, a);
};
console.log('✅ Logger ready - try checkout');
```

Then try checkout and check console.

---

## 🎯 Most Likely Issues

Based on your frontend code and common issues, here are the **top 5 culprits**:

### Issue #1: Empty Cart
**Symptom**: "Order must contain at least one item"  
**Cause**: Cart has no items when checkout is clicked  
**Fix**: Add products to cart before checkout

**Test in console:**
```javascript
console.log('Items being sent:', /* cart data */);
```

### Issue #2: Invalid Payment Amount
**Symptom**: "amount must be a positive number" or NaN error  
**Cause**: Payment amount is NaN, empty string, or 0  
**Fix**: Ensure payment amount is valid number > 0

**Test in console:**
```javascript
const amount = parseFloat('5000');
console.log('Valid?', Number.isFinite(amount) && amount > 0);
```

### Issue #3: Missing Variant ID
**Symptom**: "Item 0: missing variant_id" or "Variant X not found"  
**Cause**: Product/variant doesn't exist or wrong ID  
**Fix**: Use valid product variant that exists in database

**Test in console:**
```javascript
// Check if variant exists
fetch('/api/products/search?q=variant_id:1')
  .then(r => r.json())
  .then(console.log);
```

### Issue #4: Payment Total Mismatch
**Symptom**: "Payment total does not match order total"  
**Cause**: Sum of payments ≠ order total  
**Fix**: Ensure payments add up to order total ±0.50

**Test in console:**
```javascript
const payments = [{method: 'cash', amount: 5000}];
const total = 5000;
const sum = payments.reduce((s, p) => s + p.amount, 0);
console.log('Match?', Math.abs(sum - total) < 0.5);
```

### Issue #5: No Payment Method Selected
**Symptom**: "At least one payment method is required"  
**Cause**: Payment array is empty  
**Fix**: Select payment method before checkout

**Test in console:**
```javascript
console.log('Payments available?', /* payment array */.length > 0);
```

---

## 🔍 Validation Checklist

Before attempting checkout, verify in console:

```javascript
// Check cart
const cartOk = cart && cart.length > 0 && 
               cart.every(i => i.variant_id && i.quantity && i.unit_price);
console.log('Cart valid?', cartOk ? '✓' : '✗');

// Check payments
const paymentsOk = payments && payments.length > 0 && 
                   payments.every(p => p.method && p.amount && parseFloat(p.amount) > 0);
console.log('Payments valid?', paymentsOk ? '✓' : '✗');

// Check payment total
const paySum = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
const orderTotal = 5000; // Calculate your actual total
console.log('Total match?', Math.abs(paySum - orderTotal) < 0.5 ? '✓' : '✗');

// Check auth
console.log('Has token?', localStorage.getItem('LITTORA_token') ? '✓' : '✗');
```

All should show ✓

---

## 🧪 Direct API Test

This tests if the backend API is working correctly:

```javascript
const token = localStorage.getItem('LITTORA_token');

const testPayload = {
  channel: 'pos',
  customer_id: null,
  cashier_id: 1,
  items: [{
    variant_id: 1,
    quantity: 1,
    unit_price: 5000,
    discount_amount: 0
  }],
  payments: [{
    payment_method: 'cash',
    amount: 5000
  }],
  fulfillment_type: 'pickup',
  delivery_fee: 0,
  delivery_zone_id: null,
  delivery_address: null,
  notes: null
};

fetch('/api/orders/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(testPayload)
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => {
  console.log('Response:');
  if (data.success) {
    console.log('✅ SUCCESS! Order:', data.data);
  } else {
    console.log('❌ ERROR:', data.message);
    if (data.error) console.log('Details:', data.error);
  }
});
```

**If this works**: Your cart data is invalid  
**If this fails**: Backend API has issue

---

## 📊 What You'll Learn

| Test | Result | Meaning |
|------|--------|---------|
| Network shows 400 | ✗ | Request rejected |
| Response shows message | ✓ | We know the problem |
| Direct test works | ✓ | Cart data is issue |
| Direct test fails | ✗ | Backend API issue |
| Validation OK | ✓ | Data is valid |
| Validation fails | ✗ | Data has invalid values |

---

## 🔧 Quick Fixes to Try

1. **Clear browser cache**
   ```
   Ctrl + Shift + Delete
   Clear everything
   Reload page
   ```

2. **Hard refresh to get latest code**
   ```
   Ctrl + Shift + R
   ```

3. **Login again to get fresh token**
   ```
   Logout → Login
   ```

4. **Test with minimal order**
   ```
   1 item, cash payment, no delivery
   ```

5. **Check product exists**
   ```
   Use variant ID 1 (most common)
   ```

---

## 📝 Report Template

Once you get the error, reply with this info:

```
🔴 Error Message: 
[Copy from Response → message field]

📤 Payload Sent:
[Copy from Request tab]

📋 Tests Run:
- [ ] Network tab error captured
- [ ] Console validator ran
- [ ] Direct API test attempted
- [ ] Cart validation checked
- [ ] Token verified

💡 Other Info:
[Any other details]
```

---

## ⚡ TL;DR

1. **Open F12 → Network tab**
2. **Try checkout**
3. **Click red "checkout" request**
4. **Go to Response tab**
5. **Copy the error message**
6. **Share it with us**

That's all we need to fix it.

---

## Links to Resources

- **GET_EXACT_ERROR.md** - How to capture error
- **ACTION_PLAN.md** - What to do next
- **PRODUCTION_CHECKOUT_DEBUG.md** - Production debugging
- **CHECKOUT_DEBUG_GUIDE.md** - Comprehensive guide

---

## Final Notes

**The 400 error is generic.** The real error is in the response body.

Without the response message, we can only fix:
- Local code (done ✓)
- Generic issues (done ✓)

To fix YOUR specific issue, we need:
- **The exact error message**
- **What payload you're sending**
- **The test results**

Then fix time: **5 minutes**

---

Go get that error message! 🚀
