const test=require('node:test'),assert=require('node:assert/strict');
const {withoutCosts}=require('../src/utils/financialVisibility');
test('operational responses remove nested costs without changing receipt values',()=>{
 const original={data:[{unit_price:500,discount:20,variants:[{cost_price:150,fifo_cost_total:600,retail_price:500}],profit:350}]};
 assert.deepEqual(withoutCosts(original),{data:[{unit_price:500,discount:20,variants:[{retail_price:500}]}]});
 assert.equal(original.data[0].profit,350);
});
