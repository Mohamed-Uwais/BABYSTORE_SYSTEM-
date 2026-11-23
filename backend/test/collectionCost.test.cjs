const test=require('node:test'),assert=require('node:assert/strict');
const allocate=require('../src/utils/collectionCost'),report=require('../src/utils/collectionReport');
test('frozen collection allocations reconcile cents across partial receipts',()=>{
 const prior=[];
 for(let i=0;i<3;i++)prior.push({amount:1,recognized_fifo_cost:allocate(1,3,1,prior)});
 assert.deepEqual(prior.map(r=>r.recognized_fifo_cost),[0.33,0.34,0.33]);
});
test('later reversal negates original allocation without rewriting another receipt',()=>{
 const rows=[{id:1,delivery_id:1,expected_amount:3,amount:1,fifo_cost_total:1,recognized_fifo_cost:.33,business_receipt_date:'2026-01-01'},
 {id:2,delivery_id:1,expected_amount:3,amount:1,fifo_cost_total:1,recognized_fifo_cost:.34,business_receipt_date:'2026-01-02'}];
 const before=report(rows);rows[0].reversal_date='2026-01-03';const after=report(rows);
 assert.equal(before.details[1].cost,after.details.find(d=>d.receipt_id===2).cost);
 assert.equal(after.details.find(d=>d.kind==='reversal').cost,-.33);
 assert.equal(allocate(1,3,1,[{amount:1,recognized_fifo_cost:.34}]),.33);
});
test('unknown original or prior recognition is never fabricated',()=>{
 assert.equal(allocate(null,3,1,[]),null);
 assert.equal(allocate(1,3,1,[{amount:1,recognized_fifo_cost:null}]),null);
 assert.equal(report([{id:1,delivery_id:1,expected_amount:3,amount:1,fifo_cost_total:1,recognized_fifo_cost:null,business_receipt_date:'2026-01-01'}]).days[0].gross_profit,null);
});
