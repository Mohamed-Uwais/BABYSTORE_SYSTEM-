const test=require('node:test');
const assert=require('node:assert/strict');
const {paidLines,linkedRefund}=require('../src/utils/returnValue');
test('line-specific discounts stay on their own line before the bill discount is apportioned',()=>{
  const lines=[{id:1,line_total:'300.00'},{id:2,line_total:'50.00'}];
  assert.deepEqual([...paidLines(lines,35)],[[1,27000],[2,4500]]);
  assert.equal(linkedRefund(27000,3,1),90);
});
test('successive partial refunds reconcile to the remaining cents',()=>{
  let cents=10000;
  const refunds=[3,2,1].map(q=>{const amount=linkedRefund(cents,q,1);cents-=Math.round(amount*100);return amount});
  assert.deepEqual(refunds,[33.33,33.34,33.33]);assert.equal(cents,0);
  assert.throws(()=>linkedRefund(500,1,2));
});
