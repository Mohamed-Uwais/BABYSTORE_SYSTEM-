const {test}=require('node:test');
const assert=require('node:assert/strict');
const {definitions,values}=require('../src/services/catalogAttributes');
const defs=definitions([{key:'size',label:'Size',options:['M','L']},{key:'type',label:'Type',options:['Tape','Pant']}]);
test('variant assignments allow multiple configured options and remove duplicates',()=>{
  assert.deepEqual(values({size:['M','M','L'],type:['Tape']},defs),{size:['M','L'],type:['Tape']});
  assert.deepEqual(values({size:[]},defs),{});
});
test('attribute definitions reject unsafe keys, duplicates and invalid options',()=>{
  for(const key of ['__proto__','constructor','a.b','Size'])assert.throws(()=>definitions([{key,label:'Test',options:['A']}]));
  assert.throws(()=>definitions([defs[0],defs[0]]));
  assert.throws(()=>definitions([{key:'x',label:'X',options:['A','A']}]));
  assert.throws(()=>values({size:['XL']},defs));
  assert.throws(()=>values({material:['Wood']},defs));
});
