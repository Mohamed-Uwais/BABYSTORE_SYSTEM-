const {test}=require('node:test');
const assert=require('node:assert/strict');
const publicTracking=require('../src/services/publicTracking');
test('public courier response excludes customer details and untrusted courier fields',()=>{
 assert.deepEqual(publicTracking({status:'In Transit',receiver_name:'Private',receiver_address:'Private',phone:'Private',payments:[1]},'pending','TEST'),{status:'in_transit',courier:'Koombiyo',tracking_number:'TEST'});
 assert.equal(publicTracking({status:{private:'data'}},'pending','TEST').status,'pending');
 assert.equal(publicTracking({status:'unexpected text'},'private text','TEST').status,'unknown');
});
