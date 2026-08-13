#!/usr/bin/env node
/**
 * Test Checkout Endpoint
 * Usage: node test-checkout.js <token> [amount]
 * 
 * Example:
 *   node test-checkout.js "eyJhbGc..." 5000
 *   node test-checkout.js "eyJhbGc..." # defaults to 5000
 */

const http = require('http');

const args = process.argv.slice(2);
const token = args[0];
const amount = parseFloat(args[1]) || 5000;

if (!token) {
  console.error('Usage: node test-checkout.js <jwt_token> [amount]');
  console.error('Example: node test-checkout.js "eyJhbGc..." 5000');
  process.exit(1);
}

// Sample checkout payload
const payload = {
  channel: 'pos',
  customer_id: null,
  cashier_id: 1,
  items: [
    {
      variant_id: 1,
      quantity: 1,
      unit_price: amount,
      discount_amount: 0
    }
  ],
  payments: [
    {
      payment_method: 'cash',
      amount: amount
    }
  ],
  fulfillment_type: 'pickup',
  delivery_fee: 0,
  delivery_zone_id: null,
  delivery_address: null,
  notes: 'Test checkout order'
};

const payloadStr = JSON.stringify(payload);

console.log('🧪 Testing Checkout Endpoint');
console.log('═'.repeat(60));
console.log('URL: http://localhost:5001/api/orders/checkout');
console.log('Method: POST');
console.log('Amount: Rs.' + amount.toFixed(2));
console.log('Token: ' + token.substring(0, 20) + '...');
console.log('');
console.log('Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('');
console.log('Sending request...');
console.log('');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/orders/checkout',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadStr),
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:');
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('');
        console.log('✅ SUCCESS! Order created.');
        console.log(`Order ID: ${response.data?.orderId}`);
        console.log(`Order Number: ${response.data?.order_number}`);
      } else {
        console.log('');
        console.log('❌ ERROR: ' + response.message);
      }
    } catch (e) {
      console.log('Response (raw):');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  console.error('Make sure:');
  console.error('  1. Backend is running (npm start in backend folder)');
  console.error('  2. Token is valid (get from browser after login)');
  console.error('  3. Port 5001 is accessible');
});

req.write(payloadStr);
req.end();
