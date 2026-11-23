const test=require('node:test'),assert=require('node:assert/strict');
const {optionalNumber,validateVariant}=require('../src/utils/variantInput');
test('SKU and retail price required while omitted cost remains unknown',()=>{
 assert.doesNotThrow(()=>validateVariant({sku:'SKU',retail_price:0}));
 assert.equal(optionalNumber('','Cost'),null);
 assert.equal(optionalNumber(0,'Cost'),0);
 assert.throws(()=>validateVariant({sku:'SKU'}));
 assert.throws(()=>validateVariant({sku:' ',retail_price:1}));
});
test('optional supplied values still reject invalid prices and fractional stock',()=>{
 for(const extra of [{cost_price:-1},{weight_grams:1.5},{current_stock:-1},{retail_price:true},{discount_type:'percentage',discount_value:101}])assert.throws(()=>validateVariant({sku:'SKU',retail_price:500,...extra}));
});
