function validateAdjustment(input) {
 const count=input.new_stock!==undefined;
 const value=count?input.new_stock:input.change_qty;
 if(value==null||value===''||typeof value==='boolean'||!Number.isSafeInteger(Number(value))||Math.abs(Number(value))>100000000||(count?Number(value)<0:Number(value)===0))throw Error('Enter a valid whole stock quantity');
 if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.trim().length>500)throw Error('A stock adjustment reason is required (maximum 500 characters)');
 if(typeof input.submission_key!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(input.submission_key))throw Error('An adjustment submission key is required');
 if(count&&(!Number.isSafeInteger(Number(input.expected_stock))||input.expected_stock==null))throw Error('Reload the stock count before saving');
 if(input.unit_cost!=null&&input.unit_cost!==''&&(!Number.isFinite(Number(input.unit_cost))||Number(input.unit_cost)<0||Number(input.unit_cost)>99999999.99||typeof input.unit_cost==='boolean'))throw Error('Actual unit cost must be a valid non-negative amount');
 return {...input,reason:input.reason.trim(),count,value:Number(value)};
}
module.exports={validateAdjustment};
