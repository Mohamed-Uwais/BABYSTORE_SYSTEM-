const test = require('node:test');
const assert = require('node:assert/strict');
const distribute = require('../src/utils/purchaseCharges');
const lines = [{id:1,incoming:2,unit_cost_price:100},{id:2,incoming:1,unit_cost_price:400}];
const charge = {description:'Transport', payee:'Carrier', cents:101};
for (const [basis,fields,expected] of [
  ['quantity',{},[67,34]], ['value',{},[34,67]],
  ['weight',{weights:{1:150,2:300}},[51,50]],
  ['manual',{shares:{1:25,2:76}},[25,76]],
  ['quantity',{line_id:2},[101]],
]) {
  test('reconciles '+basis+' charge for '+(fields.line_id?'one line':'the delivery'), () => {
    assert.deepEqual(Object.values(distribute(lines,[{...charge,basis,...fields}])[0].allocation),expected);
  });
}
test('incomplete weight or manual amounts cannot create a receipt', () => {
  assert.throws(()=>distribute(lines,[{...charge,basis:'weight',weights:{1:100}}]),/weight/);
  assert.throws(()=>distribute(lines,[{...charge,basis:'manual',shares:{1:0,2:100}}]),/equal/);
});
