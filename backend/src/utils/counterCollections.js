const {moneyCents}=require('./settlementAllocation');
const receivedMethods=new Set(['cash','card','bank_transfer','online_gateway']);
function counterCollections(order,payments){
 const gross=moneyCents(order.grand_total,'bill total');
 const merchandise=Math.max(0,gross-moneyCents(order.delivery_fee||0,'delivery'));
 const fullCost=order.fifo_cost_total==null?null:moneyCents(order.fifo_cost_total,'FIFO cost');
 let prior=0,priorMerchandise=0,priorCost=0;
 return payments.filter(p=>receivedMethods.has(p.payment_method)).map(p=>{
   const amount=moneyCents(p.amount,'retained payment');prior+=amount;
   if(prior>gross)throw Error('Recorded business receipts exceed the bill; reconciliation required');
   const cumulativeMerchandise=gross?Math.round(prior*merchandise/gross):0;
   const cumulativeCost=fullCost==null?null:gross?Math.round(prior*fullCost/gross):0;
   const result={...p,merchandise_amount:(cumulativeMerchandise-priorMerchandise)/100,
     delivery_amount:(amount-cumulativeMerchandise+priorMerchandise)/100,
     recognized_fifo_cost:cumulativeCost==null?null:(cumulativeCost-priorCost)/100};
   priorMerchandise=cumulativeMerchandise;priorCost=cumulativeCost||0;return result;
 });
}
module.exports={counterCollections,receivedMethods};
