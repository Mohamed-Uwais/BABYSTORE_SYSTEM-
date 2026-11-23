const test = require('node:test');
const assert = require('node:assert/strict');
const fifo = require('../src/utils/fifo');

test('stock with undocumented units cannot consume a newer receipt as original cost', async () => {
  const connection = {query: async sql => {
    if (sql.startsWith('SELECT current_stock')) return [[{current_stock:7}]];
    if (sql.startsWith('SELECT id,quantity_remaining')) return [[{id:1,quantity_remaining:5,unit_cost:100}]];
    assert.fail('Unexpected inventory mutation');
  }};
  await assert.rejects(fifo.consume(connection,1,1,1), /reconciliation/);
});

test('a historical return without batch evidence can be quarantined', async () => {
  const connection = {query: () => assert.fail('Unexpected batch mutation')};
  await assert.rejects(fifo.returnCost(connection,{},1,true,1), /unknown/);
  await fifo.returnCost(connection,{},1,false,1);
});
