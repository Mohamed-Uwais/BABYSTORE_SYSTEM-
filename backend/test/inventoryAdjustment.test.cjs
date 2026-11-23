const test=require('node:test'),assert=require('node:assert/strict');
const {validateAdjustment}=require('../src/utils/inventoryAdjustment');
const valid={change_qty:1,reason:'Count evidence',submission_key:'test-stock-123',unit_cost:150};
test('stock adjustment rejects fractional, missing and invalid quantities instead of truncating',()=>{
 for(const value of [1.5,'2units',null,'',true,NaN,0])assert.throws(()=>validateAdjustment({...valid,change_qty:value}));
 assert.equal(validateAdjustment({...valid,change_qty:'-5'}).value,-5);
});
test('stock counts require observed stock and adjustment evidence',()=>{
 assert.throws(()=>validateAdjustment({...valid,new_stock:0}));
 assert.throws(()=>validateAdjustment({...valid,reason:''}));
 assert.throws(()=>validateAdjustment({...valid,submission_key:''}));
 assert.equal(validateAdjustment({...valid,new_stock:0,expected_stock:5}).value,0);
});
test('supplied cost must be non-negative and numeric',()=>{
 for(const value of [-1,true,'bad',Infinity])assert.throws(()=>validateAdjustment({...valid,unit_cost:value}));
 assert.equal(validateAdjustment({...valid,unit_cost:0}).unit_cost,0);
});
