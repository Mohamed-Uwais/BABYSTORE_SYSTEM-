const {test}=require('node:test');
const assert=require('node:assert/strict');
const quote=require('../src/services/cartQuote');
function dependencies(stock=10){
 return {db:{query:async sql=>sql.includes('SELECT pv.retail_price')?[[{retail_price:100,discount_type:'none',available_stock:stock}]]:[[{min_quantity:3,tier_price:240}]]},deliveryModel:{calculateFee:async({total_packs})=>({total_fee:350+75*(total_packs-1)})},applyPromotions:async()=>({totalDiscount:20,appliedPromotions:[]})};
}
test('quote aggregates duplicate variants before stock and tier pricing and ignores client prices',async()=>{
 const result=await quote({items:[{variantId:1,qty:1,price:1},{variantId:1,qty:2,price:1}],fulfillment_type:'delivery',delivery_zone_id:1},dependencies());
 assert.equal(result.items.length,1);assert.equal(result.items[0].price,80);
 assert.deepEqual([result.subtotal,result.discount_total,result.delivery_fee,result.grand_total],[240,20,500,720]);
});
test('quote refuses combined quantities beyond sellable stock and invalid fulfillment',async()=>{
 await assert.rejects(quote({items:[{variantId:1,qty:1},{variantId:1,qty:2}],fulfillment_type:'pickup'},dependencies(2)),/Insufficient stock/);
 await assert.rejects(quote({items:[{variantId:1,qty:1}],fulfillment_type:'unknown'},dependencies()),/pickup or delivery/);
});
