function moneyCents(value, label) {
  const amount=Number(value), cents=Math.round(amount*100);
  if(value==null || value==='' || typeof value==='boolean' || !Number.isSafeInteger(cents) || cents<0 || Math.abs(amount*100-cents)>0.00001)throw Error('Invalid '+label);
  return cents;
}
function allocateSettlement(received, orders, allocations) {
  const available=moneyCents(received,'remittance');
  if(!Array.isArray(allocations)||!allocations.length)throw Error('Enter an allocation for each selected order');
  const seen=new Set();
  let total=0;
  const lines=allocations.map(line=>{
    if(!line || !Number.isSafeInteger(line.delivery_id))throw Error('Invalid order allocation');
    if(seen.has(line.delivery_id))throw Error('Duplicate order allocation');
    seen.add(line.delivery_id);
    const order=orders.find(o=>o.id===line.delivery_id);
    if(!order || order.expected==null)throw Error('Order entitlement requires reconciliation');
    const amount=moneyCents(line.amount,'allocated amount');
    const fee=moneyCents(line.courier_fee??0,'courier fee');
    const deduction=moneyCents(line.other_deduction??0,'deduction');
    const retained=moneyCents(line.retained_delivery??0,'retained delivery');
    if(retained>moneyCents(order.delivery_fee??0,'customer delivery charge')-moneyCents(order.retained_delivery??0,'previous retained delivery'))throw Error('Retained delivery exceeds customer delivery charge');
    if((fee||deduction) && (typeof line.deduction_reason!=='string'||!line.deduction_reason.trim()||line.deduction_reason.length>500))throw Error('Explain courier fees and approved deductions');
    const balance=moneyCents(order.expected,'entitlement')-moneyCents(order.remitted,'previous remittances');
    if(balance<0)throw Error('Order balance requires reconciliation');
    if(amount+fee+deduction>balance)throw Error('Allocation exceeds order balance');
    total+=amount;
    return {delivery_id:order.id,amount:amount/100,courier_fee:fee/100,other_deduction:deduction/100,retained_delivery:retained/100,deduction_reason:line.deduction_reason?.trim()||null,remaining:(balance-amount-fee-deduction)/100,status:balance===amount+fee+deduction?'Settled':Number(order.remitted)+amount>0?'Partially settled':'Unsettled'};
  });
  if(seen.size!==orders.length)throw Error('Allocate every selected order explicitly');
  if(total>available)throw Error('Allocations exceed remittance');
  return {lines,allocated:total/100,unapplied:(available-total)/100};
}
module.exports={allocateSettlement,moneyCents};
