const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { normalizeOrder } = require('../src/utils/validateOrder');
const { claimRequest } = require('../src/utils/checkoutRequest');

function load(relative, mocks) {
  const filename = path.resolve(__dirname, relative);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  const run = vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename });
  run(name => Object.hasOwn(mocks, name) ? mocks[name] : nativeRequire(name), module, module.exports);
  return module.exports;
}
const payload = () => ({ channel: 'pos', items: [{ variant_id: 1, quantity: 2, unit_price: 50 }], payments: [{ payment_method: 'cash', amount: 100 }] });

test('normalizes numeric strings without changing totals or split payments', () => {
  const data = payload();
  data.items[0].quantity = '2'; data.delivery_fee = '20';
  data.payments = [{ payment_method: 'cash', amount: '60' }, { payment_method: 'card', amount: '60' }];
  const result = normalizeOrder(data);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.delivery_fee, 20);
  assert.equal(result.payments[1].amount, 60);
  assert.equal(data.items[0].quantity, '2');
});
test('rejects malformed, null, fractional and negative order input', () => {
  for (const value of [null, -1, 0, 1.5, 'bad', Infinity]) {
    const data = payload(); data.items[0].quantity = value;
    assert.throws(() => normalizeOrder(data));
  }
  assert.throws(() => normalizeOrder({ ...payload(), items: [null] }));
  assert.throws(() => normalizeOrder({ ...payload(), payments: [null] }));
  assert.throws(() => normalizeOrder({ ...payload(), discount_total: 101 }));
});
test('allows zero-balance settlement while rejecting negative payments', () => {
  assert.equal(normalizeOrder({ ...payload(), discount_total: 100, payments: [{ payment_method: 'cash', amount: 0 }] }).payments[0].amount, 0);
  assert.throws(() => normalizeOrder({ ...payload(), payments: [{ payment_method: 'cash', amount: -1 }] }));
});

function response() { return { status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } }; }
test('database authentication failure returns 503 rather than invalidating the token', async () => {
  const auth = load('../src/middleware/authMiddleware.js', { jsonwebtoken: { verify: () => ({ id: 1 }) }, '../models/userModel': { getUserById: async () => { throw { code: 'ECONNREFUSED' }; } } });
  const res = response();
  await auth.protect({ headers: { authorization: 'Bearer valid' } }, res, () => assert.fail('must not authenticate'));
  assert.equal(res.statusCode, 503);
});
test('disabled accounts are rejected and permissions use current database role', async () => {
  for (const active of [false, true]) {
    const auth = load('../src/middleware/authMiddleware.js', { jsonwebtoken: { verify: () => ({ id: 1, role: 'owner' }) }, '../models/userModel': {
      getUserById: async () => ({ id: 1, role: 'cashier', is_active: active }),
      getPermissions: async (id, role) => { assert.equal(role, 'cashier'); return ['billing']; },
    } });
    const req = { headers: { authorization: 'Bearer valid' } }, res = response(); let passed = false;
    await auth.protect(req, res, () => { passed = true; });
    assert.equal(passed, active);
    if (!active) assert.equal(res.statusCode, 401);
  }
});
test('idempotency replays committed order and rejects changed payload', async () => {
  const connection = { query: async sql => {
    if (sql.startsWith('SELECT payload')) return [[{ payload_hash: 'same', order_id: 9 }]];
    if (sql.startsWith('SELECT id AS')) return [[{ orderId: 9, order_number: 'ORD-2026-000009', grand_total: '100.00' }]];
    return [{}];
  } };
  assert.equal((await claimRequest(connection, 'pos:1:abcdefgh', 'same')).grand_total, 100);
  await assert.rejects(claimRequest(connection, 'pos:1:abcdefgh', 'changed'), { status: 409 });
});

function orderHarness({ stock = 10, failInsert = false, deducted = 0 } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'), release: () => calls.push('release'), destroy: () => calls.push('destroy'),
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.includes('FROM stock_batches WHERE')) return [[{id:1,quantity_remaining:stock,unit_cost:20}]];
      if (sql.includes('SELECT current_stock') || sql.includes('SELECT v.current_stock')) return [[{ current_stock: stock, cost_price: 20 }]];
      if (sql.includes('maxNum')) return [[{ maxNum: 0 }]];
      if (sql.includes('INSERT INTO orders')) { if (failInsert) throw new Error('Injected insert failure'); return [{ insertId: 12 }]; }
      if (sql.includes('FROM orders WHERE id = ? FOR UPDATE')) return [[{ id: 12, status: 'pending' }]];
      if (sql.includes('FROM sale_batch_allocations a')) return [[{order_item_id:1,batch_id:1,quantity:2,returned_qty:0,unit_cost:20}]];
      if (sql.includes('SELECT oi.*')) return [[{ id: 1, variant_id: 1, quantity: 2, line_total: 100, unit_price: 50, fifo_cost_total:40 }]];
      if (sql.includes('AS already_returned')) return [[{ already_returned: 0 }]];
      if (sql.includes('AS total_items_qty')) return [[{ total_items_qty: 2 }]];
      if (sql.includes('AS total_returned_qty')) return [[{ total_returned_qty: 1 }]];
      if(sql.includes('SELECT id,quantity FROM order_items'))return [[{id:1,quantity:2}]];
      if (sql.includes('SUM(quantity) AS quantity FROM order_items')) return [[{ variant_id: 1, quantity: 2 }]];
      if (sql.includes('AS deducted')) return [[{ deducted }]];
      return [{}];
    },
  };
  return { calls, model: load('../src/models/orderModel.js', { '../utils/applyPromotions': async items=>({totalDiscount:0,appliedPromotions:[],allocations:items.map(()=>({promotion:0,coupon:0}))}), '../config/db': { getConnection: async () => connection }, './customerModel': { addLedgerEntry: async () => {} } }) };
}
test('duplicate variant lines cannot oversell their combined stock', async () => {
  const { model, calls } = orderHarness({ stock: 3 });
  const data = payload(); data.items.push({ ...data.items[0] });
  await assert.rejects(model.createOrder(data), /Insufficient stock/);
  assert.ok(calls.includes('rollback'));
  assert.ok(!calls.some(c => c.sql?.includes('INSERT INTO orders')));
  assert.equal(calls.at(-1), 'release');
});
test('failed order insertion rolls back and releases number lock and connection', async () => {
  const { model, calls } = orderHarness({ failInsert: true });
  await assert.rejects(model.createOrder(payload()), /Injected/);
  assert.ok(calls.includes('rollback'));
  assert.ok(!calls.includes('commit'));
  assert.ok(calls.some(c => c.sql?.includes('RELEASE_LOCK')));
  assert.equal(calls.at(-1), 'release');
});
test('payment slip is persisted before order commit', async () => {
  const { model, calls } = orderHarness();
  const result = await model.createOrder({ ...payload(), payment_slip_url: '/uploads/example.png' });
  assert.equal(result.orderId, 12);
  assert.ok(calls.findIndex(c => c.sql?.includes('SET payment_slip_url')) < calls.indexOf('commit'));
});
test('accepting legacy chatbot order does not deduct stock a second time', async () => {
  const { model, calls } = orderHarness({ stock: 0, deducted: 2 });
  await model.acceptOrder(12, 1);
  assert.ok(calls.includes('commit'));
  assert.ok(!calls.some(c => c.sql?.includes('current_stock = current_stock -')));
});
test('accepting a website order deducts its stock once', async () => {
  const { model, calls } = orderHarness();
  await model.acceptOrder(12, 1);
  assert.equal(calls.filter(c => c.sql?.includes('current_stock = current_stock -')).length, 1);
});

test('failed replacement rolls the return back instead of leaving a partial exchange', async () => {
  const { model, calls } = orderHarness({ failInsert: true });
  await assert.rejects(model.processExchange({ original_order_id: 12, return_items: [{ order_item_id: 1, quantity: 1 }], refund_method: 'none', replacement: {...payload(), payments:[{payment_method:'cash',amount:50}]} }, 1), /Injected/);
  assert.ok(calls.some(c => c.sql?.includes('INSERT INTO order_returns')));
  assert.equal(calls.filter(c => c === 'rollback').length, 1);
  assert.ok(!calls.includes('commit'));
  assert.equal(calls.filter(c => c === 'release').length, 1);
});
test('successful exchange commits exactly once after return and replacement', async () => {
  const { model, calls } = orderHarness();
  const result = await model.processExchange({ original_order_id: 12, return_items: [{ order_item_id: 1, quantity: 1 }], refund_method: 'none', replacement: payload() }, 1);
  assert.equal(result.replacement.orderId, 12);
  assert.equal(calls.filter(c => c === 'commit').length, 1);
  assert.equal(calls.filter(c => c === 'begin').length, 1);
});

test('public checkout replays a committed result before consulting expired promotions', async () => {
  const controller = load('../src/controllers/publicController.js', {
    '../config/db': {}, '../models/publicModel': {}, '../models/orderModel': {}, '../models/deliveryModel': {},
    '../utils/applyPromotions': async () => assert.fail('replay must not reprice'),
    '../utils/checkoutRequest': { requestHash: () => 'hash', completedRequest: async () => ({ orderId: 7, order_number: 'ORD-7' }) },
  });
  const res = response();
  await controller.checkout({ body: { coupon_code: 'expired' }, headers: { 'idempotency-key': 'abcdefgh' } }, res, error => { throw error; });
  assert.equal(res.body.data.orderId, 7);
});

test('website checkout applies existing promotions and free delivery to the committed payload', async () => {
  let submitted;
  const controller = load('../src/controllers/publicController.js', {
    '../config/db': { query: async sql => {
      if (sql.includes('SELECT pv.retail_price')) return [[{ retail_price: '100.00', discount_type: 'none', discount_value: 0, product_id: 1 }]];
      if (sql.includes('variant_price_tiers')) return [[]];
      if (sql.includes('INSERT INTO customers')) return [{ insertId: 3 }];
      assert.fail(`Unexpected query: ${sql}`);
    } },
    '../models/publicModel': {},
    '../models/orderModel': { createOrder: async data => { submitted = data; return { orderId: 7 }; } },
    '../models/deliveryModel': { calculateFee: async () => ({ total_fee: 350 }) },
    '../utils/applyPromotions': async items => { assert.equal(items[0].unit_price, 100); return { totalDiscount: 20, freeDelivery: true }; },
    '../utils/checkoutRequest': { requestHash: () => 'hash', completedRequest: async () => null },
  });
  const res = response();
  await controller.checkout({ headers: {}, body: {
    phone: '0770000000', full_name: 'Test', fulfillment_type: 'delivery', delivery_zone_id: 1,
    delivery_address: 'Test address', payment_method: 'cod',
    items: JSON.stringify([{ variantId: 1, qty: 2, price: 1 }]),
    payments: JSON.stringify([{ payment_method: 'cod', amount: 180 }]),
  } }, res, error => { throw error; });
  assert.equal(submitted.items[0].unit_price, 100);
  assert.equal(submitted.discount_total, 20);
  assert.equal(submitted.delivery_fee, 0);
  assert.equal(submitted.delivery.receiver_name, 'Test');
  assert.equal(res.body.success, true);
});

test('repayment validates the current balance inside the transaction before ledger writes', async () => {
  const calls = [];
  const conn = {
    beginTransaction: async () => calls.push('begin'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
    query: async sql => { calls.push(sql); if(sql.includes('credit_receipts'))return [[]]; assert.match(sql, /FOR UPDATE/); return [[{ credit_balance: '50.00' }]]; },
  };
  const model = load('../src/models/customerModel.js', { '../config/db': { getConnection: async () => conn }, './financialEngine': {} });
  await assert.rejects(model.recordCreditRepayment(1, 100, '', 1,{order_id:1,method:'cash',account:'Test till',business_receipt_date:'2026-11-21',key:'test-credit-key'}), /exceeds/);
  assert.equal(calls[0], 'begin');
  assert.equal(calls.at(-2), 'rollback');
});

for (const folder of ['frontend', 'website']) {
  test(`${folder}: simultaneous checkout shares request; lost response retry keeps key; next sale gets a new key`, async () => {
    const { protectCheckout } = await import(`../../${folder}/src/api/requestSafety.js`);
    const storage = new Map();
    global.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
    const keys = []; let fail = true;
    const client = { post: async (url, body, config) => { keys.push(config.headers['Idempotency-Key']); if (fail) throw new Error('timeout'); return { data: { orderId: 1 } }; } };
    protectCheckout(client, '/checkout');
    const a = client.post('/checkout', payload()), b = client.post('/checkout', payload());
    assert.equal(a, b);
    await assert.rejects(a, /timeout/);
    fail = false;
    await client.post('/checkout', payload());
    assert.equal(keys[0], keys[1]);
    await client.post('/checkout', payload());
    assert.notEqual(keys[1], keys[2]);
  });
  test(`${folder}: concurrent GETs share work but completed reads are fresh`, async () => {
    const { deduplicateReads } = await import(`../../${folder}/src/api/requestSafety.js`);
    let count = 0; const client = { get: async () => ++count };
    deduplicateReads(client);
    await Promise.all([client.get('/products'), client.get('/products')]);
    assert.equal(count, 1);
    await client.get('/products'); assert.equal(count, 2);
    await Promise.all([client.get('/products', { signal: new AbortController().signal }), client.get('/products')]);
    assert.equal(count, 4);
  });
}
