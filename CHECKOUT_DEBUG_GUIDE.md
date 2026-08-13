#!/usr/bin/env node
/**
 * BABYSTORE-POS Checkout Debugging Guide
 * 
 * This script helps diagnose checkout API 400 errors
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║         BABYSTORE-POS Checkout API 400 Error Debugging                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

🔴 ERROR: POST https://pos.littora.lk/api/orders/checkout 400 (Bad Request)

This means the backend rejected the request as malformed or invalid.


🔍 COMMON CAUSES & FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Missing or Invalid Required Fields
   ────────────────────────────────────
   
   Required in payload:
   • channel (string): 'pos', 'website', or 'chatbot'
   • items (array): Must have at least 1 item
   • payments (array): Must have at least 1 payment
   
   Each item MUST have:
   • variant_id (number): ID of the product variant
   • quantity (number): Must be > 0
   • unit_price (number): Must be >= 0
   • discount_amount (number, optional): Defaults to 0
   
   Each payment MUST have:
   • payment_method (string): 'cash', 'card', 'store_credit', 'pay_later'
   • amount (number): Must be > 0
   
   FIX: Check browser console before checkout
   → Open DevTools: F12
   → Go to Console tab
   → Add this code:
   
   const cart = []; // Replace with actual cart data
   const payments = []; // Replace with actual payment data
   
   console.log('Cart validation:');
   console.log('- Length:', cart.length > 0 ? '✓' : '✗ EMPTY!');
   console.log('- All items have variant_id:', cart.every(i => i.variant_id) ? '✓' : '✗');
   console.log('- All items have quantity:', cart.every(i => i.quantity) ? '✓' : '✗');
   console.log('- All items have unit_price:', cart.every(i => i.unit_price !== undefined) ? '✓' : '✗');
   
   console.log('Payments validation:');
   console.log('- Length:', payments.length > 0 ? '✓' : '✗ EMPTY!');
   console.log('- All have method:', payments.every(p => p.method) ? '✓' : '✗');
   console.log('- All have amount:', payments.every(p => p.amount) ? '✓' : '✗');
   console.log('- All amounts > 0:', payments.every(p => parseFloat(p.amount) > 0) ? '✓' : '✗');


2. NaN (Not a Number) Values
   ─────────────────────────
   
   This happens when:
   • unit_price is not a valid number
   • quantity is not a valid number
   • payment amount is not a valid number
   • Calculations result in NaN (0/0, undefined operations, etc.)
   
   FIX: In browser console:
   
   // Check for NaN in cart
   cart.forEach((item, i) => {
     if (isNaN(item.quantity)) console.error('Item ' + i + ': quantity is NaN');
     if (isNaN(item.unit_price)) console.error('Item ' + i + ': unit_price is NaN');
   });
   
   // Check for NaN in payments
   payments.forEach((p, i) => {
     const amt = parseFloat(p.amount);
     if (isNaN(amt)) console.error('Payment ' + i + ': amount is NaN (value: ' + p.amount + ')');
   });


3. Payment Total Doesn't Match Order Total
   ────────────────────────────────────────
   
   The sum of payment amounts must equal the order total.
   
   Error message: "Payment total does not match order total"
   
   FIX: Verify calculation:
   
   const payments = []; // Your payment array
   const orderTotal = 5000; // Example: Rs. 5000
   
   const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
   console.log('Order Total:', orderTotal);
   console.log('Payment Total:', paymentTotal);
   console.log('Match:', Math.abs(paymentTotal - orderTotal) < 0.5 ? '✓' : '✗');


4. Invalid Variant ID
   ──────────────────
   
   The variant_id doesn't exist in the database or is not a valid number.
   
   Error message: "Variant X not found" or "Insufficient stock"
   
   FIX: Check variant exists:
   
   const variant_id = 123; // Your variant
   fetch('/api/products/' + variant_id)
     .then(r => r.json())
     .then(data => console.log('Variant exists:', data.success));


5. Insufficient Stock
   ──────────────────
   
   The product doesn't have enough stock for the requested quantity.
   
   Error message: "Insufficient stock for variant X"
   
   FIX: Reduce quantity or choose different variant
   

6. Empty Cart or Payments
   ─────────────────────
   
   Trying to checkout with empty cart or no payments.
   
   Error message: "Order must contain at least one item" 
                  "At least one payment method is required"
   
   FIX: Make sure cart and payments are populated before checkout


7. Malformed JSON
   ──────────────
   
   The request body is not valid JSON.
   
   Error message: "Invalid JSON in request body"
   
   FIX: Ensure all values are properly formatted:
   
   ✓ Correct:
     { "amount": 5000, "method": "cash" }
     { "amount": 5000.50, "method": "cash" }
   
   ✗ Wrong:
     { "amount": "Rs. 5000", "method": "cash" } // String, not number
     { "amount": undefined, "method": "cash" } // Undefined
     { "amount": NaN, "method": "cash" } // NaN


8. Cashier or Customer ID Issues
   ─────────────────────────────
   
   The user_id (cashier_id) might not be set correctly.
   
   FIX: Check user is logged in:
   
   // In browser console
   localStorage.getItem('LITTORA_token') // Should have JWT
   
   // Make request to check user
   fetch('/api/me', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('LITTORA_token') }
   }).then(r => r.json()).then(data => console.log('User:', data.data));


🔧 DEBUGGING STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Open Browser DevTools (F12)

Step 2: Go to Console tab and run:

  // Paste this entire block
  const debugCheckout = () => {
    // Check cart
    const cart = document.querySelector('[data-cart-items]')?.textContent || 'Not found';
    console.log('CART STATUS:', cart);
    
    // Check payments
    const paymentsHtml = document.querySelector('[data-payments]')?.textContent || 'Not found';
    console.log('PAYMENTS STATUS:', paymentsHtml);
    
    // Check auth
    const token = localStorage.getItem('LITTORA_token');
    console.log('AUTH TOKEN:', token ? '✓ Present' : '✗ Missing');
    
    // Look for global state (if using Redux/Context)
    if (window.__STORE__) {
      console.log('STATE:', window.__STORE__);
    }
  };
  
  debugCheckout();


Step 3: Go to Network tab

Step 4: Try checkout again

Step 5: Click on the failed request: POST /api/orders/checkout

Step 6: Check the tabs:
  • Request tab: Shows what was sent
  • Response tab: Shows error message
  • Headers tab: Check Authorization header is present


Step 7: Copy the Request payload and validate it

Step 8: Test endpoint directly:

  // In DevTools Console:
  const payload = {
    channel: 'pos',
    customer_id: null,
    cashier_id: 1,
    items: [
      { variant_id: 1, quantity: 1, unit_price: 5000, discount_amount: 0 }
    ],
    payments: [
      { payment_method: 'cash', amount: 5000 }
    ],
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
      'Authorization': 'Bearer ' + localStorage.getItem('LITTORA_token')
    },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(data => console.log('Response:', data));


📋 CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before Checkout:
☐ Cart has at least 1 item
☐ All items have valid quantity (> 0, number)
☐ All items have valid unit_price (number)
☐ All items have variant_id (number)
☐ Payments has at least 1 payment method
☐ All payments have method (string)
☐ All payments have amount (number > 0)
☐ Payment total matches order total (within Rs. 0.50)
☐ User is logged in (token in localStorage)
☐ Backend is running (http://localhost:5001)
☐ No NaN values in cart or payments
☐ All required delivery fields filled (if delivery method selected)


🧪 TESTING LOCALLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you set up locally, test the endpoint:

  # Get a valid token first by logging in, then:
  node test-checkout.js "YOUR_JWT_TOKEN_HERE" 5000


📊 EXPECTED PAYLOADS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Simple POS Order (Pickup, Cash):
{
  "channel": "pos",
  "customer_id": null,
  "cashier_id": 1,
  "items": [
    {
      "variant_id": 123,
      "quantity": 1,
      "unit_price": 5000,
      "discount_amount": 0
    }
  ],
  "payments": [
    {
      "payment_method": "cash",
      "amount": 5000
    }
  ],
  "fulfillment_type": "pickup",
  "delivery_fee": 0,
  "delivery_zone_id": null,
  "delivery_address": null,
  "notes": null
}

Multiple Items with Delivery:
{
  "channel": "pos",
  "customer_id": 5,
  "cashier_id": 1,
  "items": [
    { "variant_id": 123, "quantity": 2, "unit_price": 2500, "discount_amount": 0 },
    { "variant_id": 456, "quantity": 1, "unit_price": 2000, "discount_amount": 200 }
  ],
  "payments": [
    { "payment_method": "cash", "amount": 6800 }
  ],
  "fulfillment_type": "self_delivery",
  "delivery_fee": 200,
  "delivery_zone_id": 1,
  "delivery_address": "123 Main Street",
  "notes": "Handle with care",
  "delivery": {
    "receiver_name": "John Doe",
    "receiver_phone": "0771234567",
    "receiver_address": "123 Main Street"
  }
}


❓ COMMON ERROR MESSAGES & FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Order must contain at least one item"
→ Add items to cart before checkout

"At least one payment method is required"
→ Add payment method (Cash, Card, etc.) before checkout

"Item 0: missing variant_id"
→ Item doesn't have variant_id property
→ Check cart item structure

"Item 0: quantity must be a positive number (got: undefined)"
→ Quantity is undefined or not a number
→ Convert quantity to number: Number(item.quantity)

"Item 0: unit_price must be a valid number >= 0 (got: NaN)"
→ Price is NaN
→ Check calculations don't create NaN

"Payment 0: missing payment_method"
→ Payment method not specified
→ Must be: 'cash', 'card', 'store_credit', or 'pay_later'

"Payment 0: amount must be a positive number (got: NaN)"
→ Amount is NaN or invalid
→ Ensure parseFloat(amount) returns valid number

"Payment total does not match order total"
→ Sum of payments ≠ order total
→ Verify: payments.sum = order.total ± 0.50

"Variant 123 not found"
→ variant_id doesn't exist in database
→ Check product variant exists

"Insufficient stock for variant 123"
→ Don't have enough inventory
→ Reduce quantity or choose different variant

"Customer not found"
→ customer_id exists but customer doesn't
→ Set customer_id to null or use valid customer

"Invalid JSON in request body"
→ Malformed JSON
→ Check all values are valid JSON types


💡 TIPS FOR PRODUCTION (pos.littora.lk)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Production Issues Often Caused By:

1. Stale build - Clear cache and rebuild
   → Ctrl+Shift+Delete in browser
   → or Hard refresh: Ctrl+Shift+R

2. Environment differences
   → Production API endpoint might be different
   → Check window.API_BASE_URL or equivalent

3. Version mismatch
   → Frontend and backend versions might not match
   → Check both are updated to latest

4. Payload structure changed
   → If code was updated, payload might have different structure
   → Verify frontend and backend changes are compatible

5. Database schema changes
   → New required fields in database
   → Check migration files were run

6. Missing or invalid token
   → Token expired
   → User session lost
   → Login again and try

7. CORS issues
   → Check CORS is configured correctly on backend
   → Try from different domain/subdomain


✅ RESOLUTION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Try these in order:

☐ Clear browser cache (Ctrl+Shift+Delete)
☐ Hard refresh page (Ctrl+Shift+R)  
☐ Login again to get fresh token
☐ Verify cart has items
☐ Verify payment method is selected
☐ Open DevTools and check Console for errors
☐ Check Network tab for full error response
☐ Run debug payload from console
☐ Check backend logs for detailed error
☐ Verify backend is running and accessible
☐ Check variant IDs are valid
☐ Verify payment total matches order total
☐ Test with simple order (1 item, cash payment)
☐ Check for NaN values in console
☐ Ensure all required fields are present


═══════════════════════════════════════════════════════════════════════════════

For more detailed help, check:
- DEBUG_API_ERRORS.md
- FIXES_SUMMARY.md
- Backend logs (npm start terminal)
- Browser console (F12)
- Browser Network tab (F12 → Network)

═══════════════════════════════════════════════════════════════════════════════
`);
