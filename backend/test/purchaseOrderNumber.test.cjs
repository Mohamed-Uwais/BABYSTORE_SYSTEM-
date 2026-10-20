const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup({ failItem = false, lockAvailable = true } = {}) {
  let highest = 21;
  let tail = Promise.resolve();
  const numbers = [];
  const events = [];
  const db = { getConnection: async () => {
    let unlock;
    let ownsLock = false;
    return {
      async query(sql, params) {
        if (sql.includes('GET_LOCK')) {
          if (!lockAvailable) return [[{ acquired: 0 }]];
          const previous = tail;
          tail = new Promise(resolve => { unlock = resolve; });
          await previous;
          ownsLock = true;
          events.push('lock');
          return [[{ acquired: 1 }]];
        }
        if (sql.includes('RELEASE_LOCK')) {
          ownsLock = false; unlock(); events.push('unlock');
          return [[{ released: 1 }]];
        }
        if (sql.includes('MAX(CAST')) {
          assert(ownsLock);
          return [[{ last_number: String(highest) }]];
        }
        if (sql.includes('INSERT INTO purchase_orders')) {
          assert(!numbers.includes(params[0]));
          numbers.push(params[0]);
          highest = Number(params[0].split('-').at(-1));
          return [{ insertId: highest }];
        }
        if (sql.includes('INSERT INTO purchase_order_items')) {
          if (failItem) throw new Error('Item insert failed');
          return [{}];
        }
        if (sql.includes('SELECT po.*')) return [[{ id: highest }]];
        if (sql.includes('SELECT poi.*')) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      },
      async beginTransaction() { assert(ownsLock); events.push('begin'); },
      async commit() { events.push('commit'); },
      async rollback() { events.push('rollback'); },
      release() { assert(!ownsLock); events.push('release'); },
      destroy() { ownsLock = false; unlock?.(); },
    };
  } };
  const filename = path.resolve(__dirname, '../src/models/purchaseOrderModel.js');
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename })(
    () => db, module, module.exports
  );
  return { model: module.exports, numbers, events };
}
const order = { supplier_id: 1, items: [{ variant_id: 1, quantity: 2 }] };

test('PO numbers advance past existing suffix despite gaps and concurrent creates', async () => {
  const { model, numbers, events } = setup();
  await Promise.all([model.createPO(order), model.createPO(order)]);
  const year = new Date().getFullYear();
  assert.deepEqual(numbers, [`PO-${year}-0022`, `PO-${year}-0023`]);
  assert.equal(events.filter(e => e === 'commit').length, 2);
});

test('PO item failure rolls back and releases number lock', async () => {
  const { model, events } = setup({ failItem: true });
  await assert.rejects(model.createPO(order), /Item insert failed/);
  assert.deepEqual(events, ['lock', 'begin', 'rollback', 'unlock', 'release']);
});

test('PO lock timeout cannot begin a transaction or create a PO', async () => {
  const { model, events, numbers } = setup({ lockAvailable: false });
  await assert.rejects(model.createPO(order), /busy/);
  assert.deepEqual(numbers, []);
  assert.deepEqual(events, ['release']);
});
