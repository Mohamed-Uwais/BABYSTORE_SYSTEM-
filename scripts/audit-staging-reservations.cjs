// Read-only rehearsal report. Connection helper refuses any non-staging DB.
(async()=>{
 const db=await require('./staging-connection.cjs').connect();
 try{
  const [rows]=await db.query(`SELECT o.id AS order_id,o.channel,o.status,oi.variant_id,SUM(oi.quantity) AS ordered,
   (SELECT COALESCE(-SUM(sm.change_qty),0) FROM stock_movements sm WHERE sm.reference_type='order' AND sm.reference_id=o.id AND sm.variant_id=oi.variant_id AND sm.reason IN ('sale','refund')) AS net_deducted,
   (SELECT COUNT(*) FROM stock_movements sm WHERE sm.reference_type='order' AND sm.reference_id=o.id AND sm.variant_id=oi.variant_id AND sm.reason='refund') AS refunds,
   (SELECT COALESCE(SUM(r.quantity),0) FROM website_stock_reservations r WHERE r.order_id=o.id AND r.variant_id=oi.variant_id AND r.state='active') AS held
   FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.status='pending'
   GROUP BY o.id,o.channel,o.status,oi.variant_id ORDER BY o.id,oi.variant_id`);
  console.log(JSON.stringify(rows.map(row=>({...row,classification:Number(row.refunds)>0?'REVIEW_REFUND_HISTORY':Number(row.net_deducted)===Number(row.ordered)&&Number(row.held)===0?'ALREADY_DEDUCTED':Number(row.net_deducted)===0&&Number(row.held)===Number(row.ordered)?'RESERVED':Number(row.net_deducted)===0&&Number(row.held)===0?'UNRESERVED_LEGACY':'REVIEW_PARTIAL_OR_DUPLICATE'})),null,2));
  console.log(`Pending order/variant rows: ${rows.length}. No changes made; this is not production reconciliation.`);
 }finally{await db.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
