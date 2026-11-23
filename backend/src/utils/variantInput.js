function optionalNumber(value,label,{integer=false,required=false}={}) {
 if(value==null||value==='') {if(required)throw Error(`${label} is required`);return null;}
 const number=Number(value);
 if(typeof value==='boolean'||!Number.isFinite(number)||number<0||(integer&&!Number.isSafeInteger(number)))throw Error(`${label} must be a valid non-negative ${integer?'whole number':'amount'}`);
 return number;
}
function validateVariant(v) {
 if(typeof v.sku!=='string'||!v.sku.trim())throw Error('Each sellable variant requires a SKU');
 optionalNumber(v.retail_price,'Retail price',{required:true});
 for(const key of ['cost_price','wholesale_price','mrp','discount_value'])optionalNumber(v[key],key);
 for(const key of ['current_stock','low_stock_threshold','weight_grams'])optionalNumber(v[key],key,{integer:true});
 if(v.discount_type && !['none','fixed','percentage'].includes(v.discount_type))throw Error('Invalid discount type');
 if(v.discount_type==='percentage'&&Number(v.discount_value)>100)throw Error('Percentage discount cannot exceed 100');
}
module.exports={optionalNumber,validateVariant};
