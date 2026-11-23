const {signedCostCents:cents}=require('./collectionCost');
const fields=['business_received','merchandise_received','noncash_settled','delivery_received','fifo_cost','courier_fees','other_deductions','expenses','refunds','unapplied_change'];
function summarize(events,{from,to}={}){
 const days=new Map(),methods=new Map(),details=[];
 const seen=new Set();
 for(const event of events){
   if(seen.has(event.key))throw Error('Duplicate financial fact '+event.key);
   seen.add(event.key);
   if((from&&event.date<from)||(to&&event.date>to))continue;
   const day=days.get(event.date)||{date:event.date,...Object.fromEntries(fields.map(f=>[f,0])),unknown_cost_entries:0,reconciliation_entries:0};
   for(const field of fields)day[field]+=cents(event[field]??0);
   if(event.fifo_cost===null)day.unknown_cost_entries++;
   if(event.needs_reconciliation)day.reconciliation_entries++;
   days.set(event.date,day);
   if(event.method&&event.business_received){const key=event.date+'|'+event.method+'|'+(event.account||'Unspecified');const item=methods.get(key)||{date:event.date,method:event.method,account:event.account||'Unspecified',amount:0};item.amount+=cents(event.business_received);methods.set(key,item);}
   details.push(event);
 }
 return {days:[...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>{
   const row={...d,...Object.fromEntries(fields.map(f=>[f,d[f]/100]))};
   row.merchandise_settled=(d.merchandise_received+d.noncash_settled)/100;
   row.gross_profit=d.unknown_cost_entries?null:(d.merchandise_received+d.noncash_settled-d.fifo_cost)/100;
   row.net_after_recorded_expenses=d.unknown_cost_entries||d.reconciliation_entries?null:(d.merchandise_received+d.noncash_settled-d.fifo_cost-d.courier_fees-d.other_deductions-d.expenses)/100;
   if(d.unknown_cost_entries)row.fifo_cost=null;
   return row;
 }),methods:[...methods.values()].map(m=>({...m,amount:m.amount/100})),details};
}
module.exports=summarize;
