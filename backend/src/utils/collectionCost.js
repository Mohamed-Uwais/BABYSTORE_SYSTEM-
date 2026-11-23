const {moneyCents}=require('./settlementAllocation');
// Caller holds the bill/customer or courier lock. Reversals negate this stored allocation.
function collectionCost(fullCost,entitlement,amount,prior) {
 if(fullCost==null||prior.some(r=>r.recognized_fifo_cost==null))return null;
 const expected=moneyCents(entitlement,'merchandise entitlement');
 const received=prior.reduce((n,r)=>n+moneyCents(r.amount,'previous receipt'),0)+moneyCents(amount,'receipt');
 if(!expected)return null;
 if(received>expected)throw Error('Collected merchandise exceeds the original entitlement');
 const allocated=prior.reduce((n,r)=>n+signedCostCents(r.recognized_fifo_cost),0);
 return (Math.round(moneyCents(fullCost,'FIFO cost')*received/expected)-allocated)/100;
}
function signedCostCents(value){
 const amount=Number(value),cents=Math.round(amount*100);
 if(value==null||!Number.isSafeInteger(cents)||Math.abs(amount*100-cents)>0.00001)throw Error('Invalid recorded cost allocation');
 return cents;
}
module.exports=collectionCost;
module.exports.signedCostCents=signedCostCents;
