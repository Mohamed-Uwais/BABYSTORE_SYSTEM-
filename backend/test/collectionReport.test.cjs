const test=require('node:test'),assert=require('node:assert/strict');
const report=require('../src/utils/collectionReport');
const row={id:1,delivery_id:1,order_number:'TEST',expected_amount:3,fifo_cost_total:1,business_receipt_date:'2026-11-20',amount:1};
test('three partial receipts reconcile FIFO cents and full profit',()=>{
 const result=report([row,{...row,id:2},{...row,id:3}]);
 assert.equal(result.days[0].fifo_cost,1);
 assert.equal(result.days[0].gross_profit,2);
});
test('reversal produces equal negative recognition on its date',()=>{
 const result=report([{...row,reversal_date:'2026-11-21'}]);
 assert.equal(result.days[0].merchandise_received,-1);
 assert.equal(result.days[0].fifo_cost,-0.33);
});
test('missing original FIFO remains unknown',()=>{
 assert.equal(report([{...row,fifo_cost_total:null}]).days[0].gross_profit,null);
});
