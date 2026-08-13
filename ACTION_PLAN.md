# BABYSTORE-POS Production Checkout 400 Error - Action Plan

## Current Status
- ❌ Production: `https://pos.littora.lk` returning 400 (Bad Request)
- ✅ Local fixes: Enhanced error handling added to code (not yet deployed)
- ❌ **We don't know the exact error** (need response body)

## The Problem
You're getting a generic **400 Bad Request** from production, but without the detailed error message from the response body, we can't tell you exactly what's wrong.

## What We Need RIGHT NOW

### Option A: Capture Error in Browser (Fastest)

**On https://pos.littora.lk:**

1. Press **F12** → **Network** tab
2. Try to checkout
3. Look for red request: **checkout** 
4. Click on it
5. Go to **Response** tab
6. **Copy the entire response**
7. Share with us

It should look like:
```json
{
  "success": false,
  "message": "..."  ← THIS IS WHAT WE NEED
}
```

### Option B: Use Console Script

Paste this in Console (F12 → Console):
```javascript
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0]?.includes('/checkout')) {
    return originalFetch.apply(this, args).then(async r => {
      if (!r.ok) console.log('ERROR:', await r.json());
      return r;
    });
  }
  return originalFetch.apply(this, args);
};
console.log('Ready - try checkout');
```

Then try checkout and check console for error.

---

## Most Likely Issues (Guesses)

Without the exact error, here are the **most common causes** of 400 on production:

| Issue | Symptom | Fix |
|-------|---------|-----|
| Extra fields in payload | Backend rejects unknown fields | Remove: `applied_promotions`, `coupon_code`, `pricing_mode` |
| Wrong field names | Field name doesn't match backend | Check: `payment_method` vs `method` |
| Empty strings vs null | Backend expects null, gets "" | Ensure empty values are `null` not `""` |
| NaN in amounts | Calculation error creates NaN | Ensure all amounts are valid numbers |
| Missing variant | Product ID doesn't exist | Check variant IDs are valid |
| Stock issue | Product out of stock | Try different quantity/product |

---

## What We Changed Locally

We enhanced:
1. ✅ Checkout validation (backend)
2. ✅ Request logging (backend)
3. ✅ Frontend validation
4. ✅ Error messages

**But these changes are NOT yet on production** (pos.littora.lk).

To deploy them:
1. Commit changes: `git add . && git commit -m "Enhanced checkout validation"`
2. Push: `git push`
3. Deploy to production server
4. Restart backend on production

---

## Immediate Workaround

If it's a **field naming issue**, try this test in Console:

```javascript
// Minimal working payload
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
  })
})
.then(r => r.json())
.then(data => {
  console.log('SUCCESS:', data.success);
  console.log('MESSAGE:', data.message);
  if (data.error) console.log('ERROR:', data.error);
});
```

If this **works**: Your actual cart data has invalid values.
If this **fails**: There's a backend/API issue.

---

## Checklist to Do NOW

- [ ] Capture actual error response from Network tab
- [ ] Share exact error message
- [ ] Run console test payload above
- [ ] Check if changes are deployed to production

---

## Files We Created for Debugging

- **GET_EXACT_ERROR.md** - How to capture error (this is key!)
- **PRODUCTION_CHECKOUT_DEBUG.md** - Production troubleshooting
- **CHECKOUT_DEBUG_GUIDE.md** - Detailed error guide
- **CAPTURE_CHECKOUT_ERROR.js** - Auto-capture script

---

## Next Steps

1. **Get the error message** from Network Response
2. **Share it exactly** (e.g., "Item 0: missing variant_id")
3. **We'll tell you the exact fix**

---

## Bottom Line

**The 400 error is not helpful without the response message.**

To get the message:
- 🔴 Go to: https://pos.littora.lk
- 🔴 Press: F12 → Network tab
- 🔴 Try checkout
- 🔴 Click the red "checkout" request
- 🔴 Go to Response tab
- 🔴 Copy the error message

That's it. Then we can fix it in 5 minutes.

---

## Questions?

Once you have the error message, reply with:
```
Error Message: [exact message from Response tab]
Payload: [what you sent - from Request tab]
```

And we'll fix it immediately.
