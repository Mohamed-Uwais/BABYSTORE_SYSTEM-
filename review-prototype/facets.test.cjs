const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=vm.runInNewContext(fs.readFileSync(__dirname+'/facets.js','utf8')+';CatalogDemo');
const products=[
 {id:1,category:'Diapers',brand:'Pretty Baby',size:'M',price:1500,stock:2,attributes:{type:'Tape',pieces:'30'}},
 {id:2,category:'Diapers',brand:'Pretty Baby',size:'L',price:1800,stock:0,attributes:{type:'Pant',pieces:'30'}},
 {id:3,category:'Toys',brand:'Little Play',price:2200,stock:3,attributes:{type:'Die-cast'}},
 {id:4,category:'Flowers and décor',price:1200,stock:2,attributes:{colour:'Pink',material:'Ceramic'}}
];
const state={category:'',min:'',max:'',available:'',attributes:{}};
const ids=filter=>Array.from(catalog.filter(products,{...state,...filter}),p=>p.id);
test('category schemas expose relevant attributes',()=>{
 assert.ok(catalog.categories.find(c=>c.name==='Diapers').attributes.some(a=>a.key==='size'));
 assert.ok(!catalog.categories.find(c=>c.name==='Flowers and décor').attributes.some(a=>a.key==='size'));
});
test('OR within one attribute and AND across attributes',()=>{
 assert.deepEqual(ids({category:'Diapers',attributes:{size:['M','L'],type:['Tape']}}),[1]);
 assert.deepEqual(ids({category:'Diapers',attributes:{size:['M','L']}}),[1,2]);
});
test('price bounds and availability intersect inclusively',()=>{
 assert.deepEqual(ids({category:'Diapers',min:'1500',max:'1800',available:'yes'}),[1]);
 assert.deepEqual(ids({min:'1800',max:'1500'}),[]);
});
test('category plus incompatible attributes gives no false match',()=>{
 assert.deepEqual(ids({category:'Toys',attributes:{type:['Tape']}}),[]);
 assert.deepEqual(ids({category:'Flowers and décor',attributes:{colour:['Pink'],material:['Ceramic']}}),[4]);
});
test('routine new attribute assignments require no filter engine changes',()=>{
 const product={...products[2],attributes:{finish:'Metallic'}};
 assert.equal(catalog.filter([product],{...state,attributes:{finish:['Metallic']}}).length,1);
 assert.equal(catalog.filter([product],{...state,attributes:{finish:['Matte']}}).length,0);
});
