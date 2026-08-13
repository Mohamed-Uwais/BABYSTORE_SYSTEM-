#!/usr/bin/env node
/**
 * BABYSTORE-POS Production Checkout Error Capture
 * 
 * Copy-paste this entire script into DevTools Console (F12) on pos.littora.lk
 * It will capture the exact error and payload
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                  CHECKOUT ERROR CAPTURE SCRIPT                              ║
║                                                                              ║
║  This will intercept the next checkout attempt and show exact error         ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

// Store original fetch
const originalFetch = window.fetch;
let capturedRequest = null;
let capturedResponse = null;

// Intercept all fetch calls
window.fetch = function(...args) {
  const [url, options] = args;
  
  // Only intercept checkout endpoint
  if (url && url.includes('/checkout')) {
    console.log('🔍 INTERCEPTED CHECKOUT REQUEST');
    console.log('─'.repeat(80));
    
    // Log request details
    console.log('📤 REQUEST DETAILS:');
    console.log('URL:', url);
    console.log('Method:', options?.method || 'GET');
    console.log('Headers:', options?.headers);
    
    if (options?.body) {
      try {
        const payload = JSON.parse(options.body);
        console.log('Body (parsed):', payload);
        console.log('\n📋 PAYLOAD BREAKDOWN:');
        console.log('  • channel:', payload.channel);
        console.log('  • customer_id:', payload.customer_id);
        console.log('  • cashier_id:', payload.cashier_id);
        console.log('  • items:', payload.items?.length || 0, 'items');
        if (payload.items && payload.items.length > 0) {
          payload.items.forEach((item, i) => {
            console.log(`    [${i}]`, {
              variant_id: item.variant_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount_amount
            });
          });
        }
        console.log('  • payments:', payload.payments?.length || 0, 'payments');
        if (payload.payments && payload.payments.length > 0) {
          payload.payments.forEach((p, i) => {
            console.log(`    [${i}]`, {
              method: p.payment_method,
              amount: p.amount
            });
          });
        }
        console.log('  • fulfillment_type:', payload.fulfillment_type);
        console.log('  • delivery_fee:', payload.delivery_fee);
        console.log('  • discount_total:', payload.discount_total);
        
        capturedRequest = payload;
      } catch (e) {
        console.error('Failed to parse body:', e);
        capturedRequest = options.body;
      }
    }
    
    // Call original fetch and intercept response
    return originalFetch.apply(this, args)
      .then(async (response) => {
        const clonedResponse = response.clone();
        
        // Only log if it's an error (4xx, 5xx)
        if (!response.ok) {
          console.log('\n📥 RESPONSE DETAILS:');
          console.log('Status:', response.status, response.statusText);
          console.log('Headers:', {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length')
          });
          
          try {
            const responseData = await clonedResponse.json();
            console.log('\n❌ ERROR RESPONSE:');
            console.log(JSON.stringify(responseData, null, 2));
            capturedResponse = responseData;
            
            // Log specific error details
            if (responseData.message) {
              console.log('\n🔴 ERROR MESSAGE:');
              console.log(responseData.message);
            }
            if (responseData.error) {
              console.log('\n📌 ERROR DETAILS:');
              console.log(responseData.error);
            }
            
            // Suggest fixes based on error
            console.log('\n💡 ANALYSIS:');
            const msg = responseData.message || '';
            if (msg.includes('missing') || msg.includes('require')) {
              console.log('→ Missing or invalid required field');
              console.log('→ Check the payload above for null/undefined values');
            }
            if (msg.includes('NaN') || msg.includes('not a number')) {
              console.log('→ One of the numeric values is NaN');
              console.log('→ Check quantities and prices are valid numbers');
            }
            if (msg.includes('stock')) {
              console.log('→ Insufficient inventory');
              console.log('→ Try reducing quantity or choose different product');
            }
            if (msg.includes('Payment') && msg.includes('match')) {
              console.log('→ Payment total doesn\'t equal order total');
              const payTotal = capturedRequest?.payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
              const orderTotal = capturedRequest?.subtotal - capturedRequest?.discount_total + capturedRequest?.delivery_fee;
              console.log('→ Payment sum:', payTotal);
              console.log('→ Order total:', orderTotal);
              console.log('→ Difference:', Math.abs(payTotal - orderTotal));
            }
          } catch (e) {
            console.log('Response (raw):', await clonedResponse.text());
          }
        } else {
          console.log('\n✅ SUCCESS - Order created');
          const data = await clonedResponse.json();
          console.log('Order ID:', data.data?.orderId);
          console.log('Order Number:', data.data?.order_number);
        }
        
        console.log('\n' + '─'.repeat(80));
        console.log('📋 To report this issue, share:');
        console.log('1. The ERROR MESSAGE above');
        console.log('2. The PAYLOAD BREAKDOWN');
        console.log('3. Any 📌 ERROR DETAILS');
        
        return response;
      })
      .catch(err => {
        console.error('Fetch error:', err);
        return originalFetch.apply(this, args);
      });
  }
  
  // Pass through non-checkout requests
  return originalFetch.apply(this, args);
};

console.log('✅ Script installed. Now try checkout again...');
console.log('─'.repeat(80));
console.log('');
