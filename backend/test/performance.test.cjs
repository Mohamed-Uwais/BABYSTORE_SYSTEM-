const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function catalogue() {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    return sql.includes('COUNT(DISTINCT p.id) AS total') ? [[{ total: 25 }]] : [[{ id: 7, retail_price: 100 }]];
  } };
  const module = { exports: {} };
  const filename = path.join(__dirname, '../src/models/publicModel.js');
  const run = vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename });
  run(name => {
    if (name === '../config/db') return db;
    if (name === './productImageModel') return { getImagesByProductIds: async ids => {
      assert.deepEqual(ids, [7]);
      return { 7: [{ image_url: '/one.webp' }, { image_url: '/two.webp' }] };
    } };
    throw new Error(`Unexpected import ${name}`);
  }, module, module.exports);
  return { model: module.exports, calls };
}

test('compact catalogue preserves pagination, prices and both card images', async () => {
  const { model, calls } = catalogue();
  const result = await model.getProducts({ view: 'card', limit: 24, offset: 24, search: 'baby' });
  assert.equal(result.total, 25);
  assert.equal(result.products[0].retail_price, 100);
  assert.equal(result.products[0].image_url, '/one.webp');
  assert.equal(result.products[0].second_image_url, '/two.webp');
  assert.deepEqual(calls[1].params.slice(-2), [24, 24]);
  assert(!calls[1].sql.includes('p.description'));
  assert(!calls[1].sql.includes('SUM(oi.quantity)'));
  assert(calls[1].sql.includes('p.id DESC'));
  assert.equal(calls[0].params[0], '%baby%');
});

test('best-selling and legacy catalogue retain their required sales aggregate', async () => {
  for (const options of [{ view: 'card', sort: 'best_selling' }, {}]) {
    const { model, calls } = catalogue();
    await model.getProducts(options);
    assert(calls[1].sql.includes('SUM(oi.quantity)'));
    if (!options.view) assert(calls[1].sql.includes('p.description'));
  }
});
