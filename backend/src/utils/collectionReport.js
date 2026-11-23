const {moneyCents}=require('./settlementAllocation');
function collectionReport(rows) {
  const balances=new Map(), days=new Map(), details=[];
  const add=(date,entry)=>{
    if(!date)return;
    const day=days.get(date)||{date,merchandise_received:0,fifo_cost:0,gross_profit:0,unknown_cost_entries:0};
    day.merchandise_received+=entry.received;
    if(entry.cost==null)day.unknown_cost_entries++;
    else {day.fifo_cost+=entry.cost;day.gross_profit+=entry.received-entry.cost;}
    days.set(date,day);
    details.push({...entry,date});
  };
  // Cumulative rounding reconciles each order's full cost across partial receipts.
  for(const row of rows){
    const received=moneyCents(row.amount,'received amount');
    const expected=moneyCents(row.expected_amount,'entitlement');
    const prior=balances.get(row.delivery_id)||{received:0,cost:0};
    const total=prior.received+received;
    const fullCost=row.fifo_cost_total==null?null:moneyCents(row.fifo_cost_total,'FIFO cost');
    const cost=Object.hasOwn(row,'recognized_fifo_cost')
      ? (row.recognized_fifo_cost==null?null:require('./collectionCost').signedCostCents(row.recognized_fifo_cost))
      : fullCost==null||!expected?null:Math.round(fullCost*total/expected)-prior.cost;
    add(row.business_receipt_date,{receipt_id:row.id,order_number:row.order_number,received,cost,kind:'receipt'});
    if(row.reversal_date){
      add(row.reversal_date,{receipt_id:row.id,order_number:row.order_number,received:-received,cost:cost==null?null:-cost,kind:'reversal'});
    } else {
      balances.set(row.delivery_id,{received:total,cost:prior.cost+(cost||0)});
    }
  }
  return {
    days:[...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>({...d,merchandise_received:d.merchandise_received/100,fifo_cost:d.unknown_cost_entries?null:d.fifo_cost/100,gross_profit:d.unknown_cost_entries?null:d.gross_profit/100})),
    details:details.map(d=>({...d,received:d.received/100,cost:d.cost==null?null:d.cost/100}))
  };
}
module.exports=collectionReport;
