const db=require('../config/db');
const {counterCollections}=require('../utils/counterCollections');
const summarize=require('../utils/unifiedCollections');
const day=column=>`DATE_FORMAT(CONVERT_TZ(${column},@@session.time_zone,'+05:30'),'%Y-%m-%d')`;
async function report(filters={}){
 for(const key of ['from','to'])if(filters[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(filters[key])||!Number.isFinite(Date.parse(filters[key]))))throw Error('Use valid report dates');
 if(filters.from&&filters.to&&filters.from>filters.to)throw Error('Start date must precede end date');
 const events=[],exceptions=[];
 const [counter]=await db.query(`SELECT p.id,p.order_id,p.payment_method,p.amount,p.reference_note,${day('p.paid_at')} date,
 o.order_number,o.grand_total,o.delivery_fee,
 (SELECT IF(COUNT(*)>0 AND COUNT(*)=COUNT(fifo_cost_total),SUM(fifo_cost_total),NULL) FROM order_items WHERE order_id=o.id) fifo_cost_total
 FROM order_payments p JOIN orders o ON o.id=p.order_id
 WHERE o.channel='pos' AND o.fulfillment_type<>'courier_delivery'
 AND p.payment_method IN ('cash','card','bank_transfer','online_gateway') ORDER BY o.id,p.id`);
 const groups=new Map();for(const row of counter){if(!groups.has(row.order_id))groups.set(row.order_id,[]);groups.get(row.order_id).push(row);}
 for(const rows of groups.values()){
   try{for(const r of counterCollections(rows[0],rows))events.push({key:'counter:'+r.id,date:r.date,source:'Counter receipt',order_number:r.order_number,method:r.payment_method,account:r.reference_note||null,business_received:Number(r.amount),merchandise_received:r.merchandise_amount,delivery_received:r.delivery_amount,fifo_cost:r.recognized_fifo_cost});}
   catch(error){exceptions.push({order_number:rows[0].order_number,message:error.message});}
 }
 const [credit]=await db.query(`SELECT r.*,o.order_number,DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') date,DATE_FORMAT(v.business_date,'%Y-%m-%d') reversal_date FROM credit_receipts r JOIN orders o ON o.id=r.order_id LEFT JOIN credit_receipt_reversals v ON v.receipt_id=r.id`);
 const addReversible=(event,reversalDate)=>{
   events.push(event);
   if(reversalDate){const reversed={...event,key:event.key+':reversal',date:reversalDate,source:event.source+' reversal'};for(const field of ['business_received','merchandise_received','noncash_settled','delivery_received','fifo_cost','courier_fees','other_deductions','unapplied_change','retained_delivery'])if(reversed[field]!=null)reversed[field]=-reversed[field];events.push(reversed);}
 };
 for(const r of credit)addReversible({key:'credit:'+r.id,date:r.date,source:'Credit collection',order_number:r.order_number,method:r.method,account:r.receiving_account,business_received:Number(r.amount),merchandise_received:Number(r.merchandise_amount),delivery_received:Number(r.amount)-Number(r.merchandise_amount),fifo_cost:r.recognized_fifo_cost==null?null:Number(r.recognized_fifo_cost)},r.reversal_date);
 const [remittances]=await db.query(`SELECT r.*,DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') date,${day('v.reversed_at')} reversal_date FROM courier_remittances r LEFT JOIN courier_remittance_reversals v ON v.remittance_id=r.id`);
 const [allocations]=await db.query('SELECT l.*,o.order_number FROM courier_remittance_lines l JOIN order_deliveries d ON d.id=l.delivery_id JOIN orders o ON o.id=d.order_id');
 for(const r of remittances){
   // Header records actual money once. Later allocations carry zero new cash.
   addReversible({key:'remittance:'+r.id,date:r.date,source:'Courier bank/cash receipt',method:r.method,account:r.receiving_account,business_received:Number(r.amount),unapplied_change:Number(r.amount)},r.reversal_date);
   for(const l of allocations.filter(l=>l.remittance_id===r.id))addReversible({key:'allocation:'+r.id+':'+l.delivery_id,date:r.date,source:'Courier allocation',order_number:l.order_number,merchandise_received:Number(l.amount),noncash_settled:Number(l.courier_fee)+Number(l.other_deduction),fifo_cost:l.recognized_fifo_cost==null||l.recognized_deduction_cost==null?null:Number(l.recognized_fifo_cost)+Number(l.recognized_deduction_cost),courier_fees:Number(l.courier_fee),other_deductions:Number(l.other_deduction),retained_delivery:Number(l.retained_delivery),unapplied_change:-Number(l.amount)},r.reversal_date);
 }
 const [expenses]=await db.query("SELECT id,amount,DATE_FORMAT(expense_date,'%Y-%m-%d') date,payment_method,description FROM expenses");
 for(const e of expenses)events.push({key:'expense:'+e.id,date:e.date,source:'Operating expense',description:e.description,method:e.payment_method,business_received:-Number(e.amount),expenses:Number(e.amount)});
 const [refunds]=await db.query(`SELECT r.id,r.order_id,r.refund_amount,${day('r.created_at')} date,o.order_number FROM order_returns r JOIN orders o ON o.id=r.order_id`);
 // Legacy return records do not establish cash disbursement, credit relief or tender method.
 for(const r of refunds)events.push({key:'return:'+r.id,date:r.date,source:'Return requiring payment reconciliation',order_number:r.order_number,refunds:Number(r.refund_amount),needs_reconciliation:true});
 const result=summarize(events,filters);
 return {...result,exceptions,refreshed_at:new Date().toISOString(),basis:'Business receipt dates; customer COD payments are not business receipts',limitations:['Return disbursement/credit-relief reconciliation is required before affected daily net results can be finalized.','Courier fees and deductions are shown separately; retained delivery is not merchandise income.','Historical counter records without FIFO evidence have unknown profit.']};
}
module.exports={report};
