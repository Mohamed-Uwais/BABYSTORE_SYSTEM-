const test=require('node:test'),assert=require('node:assert/strict');
const {cappedBills}=require('../src/utils/salesAccess');
test('cashier cap stops before a larger recent bill without skipping',()=>{
 const rows=[{id:3,grand_total:30000},{id:2,grand_total:30000},{id:1,grand_total:1}];
 assert.deepEqual(cappedBills(rows).map(r=>r.id),[3]);
});
test('newest oversized bill hides all bills; exact cap fits',()=>{
 assert.equal(cappedBills([{grand_total:51785.01},{grand_total:1}]).length,0);
 assert.equal(cappedBills([{grand_total:51785}]).length,1);
});
test('pagination and search cannot reveal bills outside the capped prefix',()=>{
 const {visibleBills}=require('../src/middleware/salesScope');
 const rows=cappedBills([{id:3,order_number:'A',grand_total:30000},{id:2,order_number:'B',grand_total:30000},{id:1,order_number:'C',grand_total:1}]);
 assert.deepEqual(visibleBills(rows,{q:'C'}),[]);
 assert.deepEqual(visibleBills(rows,{page:2,limit:1}),[]);
});
