# URGENT: How to Get the Exact Error Message

The 400 error is still happening because the backend is rejecting your checkout request. 
We need to see the **exact error message** to fix it.

## 🎯 Quick Steps (5 minutes)

### Step 1: Open Production Site
Go to: **https://pos.littora.lk**

### Step 2: Open DevTools & Console
Press: **F12** → Click **Console** tab

### Step 3: Paste Error Capture Script
Copy everything below and paste into Console:

```javascript
// Store original fetch
const originalFetch = window.fetch;
let capturedRequest = null;

// Intercept checkout requests
window.fetch = function(...args) {
  const [url, options] = args;
  
  if (url && url.includes('/checkout')) {
    console.log('🔍 CAPTURING CHECKOUT REQUEST...');
    
    // Log what's being sent
    if (options?.body) {
      try {
        const payload = JSON.parse(options.body);
        console.log('📤 SENDING PAYLOAD:');
        console.log(JSON.stringify(payload, null, 2));
        capturedRequest = payload;
      } catch (e) {
        console.log('Body:', options.body);
      }
    }
    
    // Intercept response
    return originalFetch.apply(this, args)
      .then(async (response) => {
        const cloned = response.clone();
        
        if (!response.ok) {
          try {
            const data = await cloned.json();
            console.log('\n❌ ERROR RESPONSE:');
            console.log(JSON.stringify(data, null, 2));
            console.log('\n🔴 ERROR MESSAGE:', data.message);
            console.log('\n💾 FULL ERROR:', data);
          } catch (e) {
            console.log('Response:', await cloned.text());
          }
        } else {
          console.log('✅ Success!', await cloned.json());
        }
        
        return response;
      });
  }
  
  return originalFetch.apply(this, args);
};

console.log('✅ Script ready. Try checkout now...');
```

### Step 4: Try Checkout
1. Add items to cart
2. Select payment method
3. Click "Complete Sale" or "Checkout"
4. **Look at the console** - you'll see the error

### Step 5: Copy the Output
Look for:
- **📤 SENDING PAYLOAD:** - What you sent
- **❌ ERROR RESPONSE:** - What backend said
- **🔴 ERROR MESSAGE:** - The specific error

---

## 🔍 What to Look For

You should see output like:

```
🔍 CAPTURING CHECKOUT REQUEST...

📤 SENDING PAYLOAD:
{
  "channel": "pos",
  "customer_id": null,
  "items": [...],
  "payments": [...],
  ...
}

❌ ERROR RESPONSE:
{
  "success": false,
  "message": "Item 0: missing variant_id"
}

🔴 ERROR MESSAGE: Item 0: missing variant_id
```

**The ERROR MESSAGE is what we need.**

---

## 🚀 Alternative: Use Network Tab

If console method doesn't work:

1. Press **F12** → **Network** tab
2. **Refresh page** (Ctrl+R)
3. Try checkout
4. Look for red request: **checkout**
5. Click on it
6. Go to **Response** tab
7. Read the error message
8. Also click **Request** or **Payload** tab to see what was sent

---

## 📊 Common Error Messages We're Looking For

```
❌ "Item 0: missing variant_id"
→ Cart item missing product ID

❌ "Item 0: quantity must be a positive number"
→ Quantity is invalid or 0

❌ "Item 0: unit_price must be a valid number >= 0 (got: NaN)"
→ Price calculation resulted in NaN

❌ "Payment 0: missing payment_method"
→ Payment method not selected

❌ "Payment 0: amount must be a positive number (got: NaN)"
→ Payment amount is NaN or invalid

❌ "Payment total does not match order total"
→ Sum of payments ≠ order total

❌ "Order must contain at least one item"
→ Cart is empty

❌ "At least one payment method is required"
→ No payments added

❌ "Variant 123 not found"
→ Product doesn't exist

❌ "Insufficient stock for variant 123"
→ Not enough inventory
```

---

## 💡 Why This Matters

The **ERROR MESSAGE** will tell us exactly:
1. What field is invalid
2. What value was sent
3. What the backend expected

Without it, we're just guessing.

---

## 📝 Once You Have the Error

Share with us:
1. The exact **ERROR MESSAGE**
2. The **SENDING PAYLOAD** (what your cart/payment data looks like)
3. Any pattern you notice

Example:
```
ERROR: "Item 0: missing variant_id"
PAYLOAD: 
{
  items: [{quantity: 1, unit_price: 5000}],  // ← Missing variant_id!
  ...
}
```

Then we can fix the exact issue.

---

## 🎯 TL;DR - Just Do This

1. Go to: https://pos.littora.lk
2. Press: **F12**
3. Go to: **Network** tab (or Console)
4. Try checkout
5. Look for **checkout** request (red if failed)
6. Click on it → **Response** tab
7. **Copy the error message**
8. **Share it with us**

That's it. The error message will tell us everything.

---

## ⚡ Quick Test in Console

Or run this to test the endpoint with minimal data:

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
    items: [{variant_id: 1, quantity: 1, unit_price: 1000, discount_amount: 0}],
    payments: [{payment_method: 'cash', amount: 1000}],
    fulfillment_type: 'pickup',
    delivery_fee: 0,
    delivery_zone_id: null,
    delivery_address: null,
    notes: null
  })
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  if (!data.success) console.log('ERROR:', data.message);
});
```

This will show if it's an API issue or your specific cart data issue.

---

**Need Help?**

Once you get the error message, we'll know exactly what to fix. 
The 400 error is just the HTTP status - the real error is in the response body.
