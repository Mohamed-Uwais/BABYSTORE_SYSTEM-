function allocateTender(payments, total) {
  const cents = payments.map(p => Math.round(Number(p.amount) * 100));
  const due = Math.round(total * 100);
  if (!Number.isSafeInteger(due) || due < 0 || cents.some(n => !Number.isSafeInteger(n) || n < 0 || (n === 0 && due > 0))) throw Error('Invalid payment amount');
  let change = cents.reduce((a,b)=>a+b,0) - due;
  const cash = cents.reduce((sum,n,i)=>sum+(payments[i].payment_method==='cash'?n:0),0);
  if (change < 0 || change > cash) throw Error('Payment total does not cover the bill or non-cash payments exceed the total');
  return payments.map((p,i)=>{
    if(p.payment_method !== 'cash') return {...p,amount:cents[i]/100,cash_tendered:null};
    const returned = Math.min(change,cents[i]);
    change -= returned;
    return {...p,amount:(cents[i]-returned)/100,cash_tendered:cents[i]/100};
  });
}
module.exports = allocateTender;
