const test=require('node:test');
const assert=require('node:assert/strict');
const {allocateSettlement}=require('../src/utils/settlementAllocation');
const orders=[{id:1,expected:4900,remitted:0}];
test('COD merchandise allocation leaves delivery outside merchandise entitlement',()=>{
 const plan=allocateSettlement(4900,orders,[{delivery_id:1,amount:4900}]);
 assert.equal(plan.lines[0].status,'Settled');
 assert.equal(plan.unapplied,0);
});
test('partial remittance preserves remaining entitlement',()=>{
 const plan=allocateSettlement(1500,orders,[{delivery_id:1,amount:1500}]);
 assert.equal(plan.lines[0].remaining,3400);
 assert.equal(plan.lines[0].status,'Partially settled');
});
test('excess receipt remains unapplied without overallocating merchandise',()=>{
 const plan=allocateSettlement(5000,orders,[{delivery_id:1,amount:4900}]);
 assert.equal(plan.unapplied,100);
 assert.throws(()=>allocateSettlement(5000,orders,[{delivery_id:1,amount:5000}]),/balance/);
});
test('allocation cannot exceed received cash or duplicate an order',()=>{
 assert.throws(()=>allocateSettlement(100,orders,[{delivery_id:1,amount:101}]),/remittance/);
 assert.throws(()=>allocateSettlement(100,orders,[{delivery_id:1,amount:50},{delivery_id:1,amount:50}]),/Duplicate/);
});
test('all selected orders and cent amounts require explicit valid allocations',()=>{
 assert.throws(()=>allocateSettlement(100,[...orders,{id:2,expected:100,remitted:0}],[{delivery_id:1,amount:100}]),/every/);
 for(const amount of [null,'',true,-1,0.001])assert.throws(()=>allocateSettlement(100,orders,[{delivery_id:1,amount}]),/Invalid/);
});
test('retained delivery is separate from merchandise, additional fees require evidence',()=>{
 const order=[{id:1,expected:4900,remitted:0,delivery_fee:600}];
 const line={delivery_id:1,amount:4800,courier_fee:100,retained_delivery:600,deduction_reason:'Approved carrier invoice'};
 const plan=allocateSettlement(4800,order,[line]);
 assert.equal(plan.lines[0].remaining,0);
 assert.equal(plan.lines[0].retained_delivery,600);
 assert.equal(plan.allocated,4800);
 assert.throws(()=>allocateSettlement(4800,order,[{...line,deduction_reason:''}]),/Explain/);
 assert.throws(()=>allocateSettlement(4800,order,[{...line,retained_delivery:601}]),/delivery/);
});
test('unexplained shortage remains outstanding; authorised deduction resolves only its amount',()=>{
 const shortage=allocateSettlement(4800,orders,[{delivery_id:1,amount:4800}]);
 assert.equal(shortage.lines[0].remaining,100);
 const approved=allocateSettlement(4800,orders,[{delivery_id:1,amount:4800,other_deduction:75,deduction_reason:'Approved damaged parcel claim'}]);
 assert.equal(approved.lines[0].remaining,25);
});
