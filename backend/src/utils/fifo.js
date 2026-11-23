async function consume(connection, itemId, variantId, quantity) {
  const [[variant]] = await connection.query('SELECT current_stock FROM product_variants WHERE id = ? FOR UPDATE',[variantId]);
  const [batches] = await connection.query(
    'SELECT id,quantity_remaining,unit_cost FROM stock_batches WHERE variant_id=? AND quantity_remaining>0 ORDER BY received_at,id FOR UPDATE',[variantId]);
  if (batches.some(batch=>batch.unit_cost==null) || batches.reduce((n,b)=>n+Number(b.quantity_remaining),0)!==Number(variant.current_stock)) {
    throw Error('Physical stock and costed receipt batches need reconciliation before sale');
  }
  let left = quantity, cost = 0;
  for(const batch of batches){
    const used = Math.min(left,batch.quantity_remaining);
    await connection.query('UPDATE stock_batches SET quantity_remaining=quantity_remaining-? WHERE id=?',[used,batch.id]);
    await connection.query('INSERT INTO sale_batch_allocations(order_item_id,batch_id,quantity,unit_cost) VALUES(?,?,?,?)',[itemId,batch.id,used,batch.unit_cost]);
    cost += used*Math.round(Number(batch.unit_cost)*100);
    left -= used;
    if(!left) break;
  }
  if(left) throw Error('Receipt batch quantities do not cover this sale. Reconcile stock before billing.');
  await connection.query('UPDATE order_items SET fifo_cost_total=?,cost_price_snapshot=? WHERE id=?',[cost/100,cost/100/quantity,itemId]);
}
async function returnCost(connection,item,quantity,restock,returnId){
  if(item.fifo_cost_total==null) {
    if (restock) throw Error('Original batch cost is unknown. Receive this return into quarantine for reconciliation.');
    return;
  }
  const [rows]=await connection.query('SELECT a.* FROM sale_batch_allocations a JOIN stock_batches b ON b.id=a.batch_id WHERE a.order_item_id=? ORDER BY b.received_at,b.id FOR UPDATE',[item.id]);
  let left=Number(quantity),cost=0;
  for(const row of rows){
    const restored=Math.min(left,row.quantity-row.returned_qty);
    if(!restored) continue;
    await connection.query('UPDATE sale_batch_allocations SET returned_qty=returned_qty+? WHERE order_item_id=? AND batch_id=?',[restored,item.id,row.batch_id]);
    if(restock) await connection.query('UPDATE stock_batches SET quantity_remaining=quantity_remaining+? WHERE id=?',[restored,row.batch_id]);
    cost+=restored*Math.round(Number(row.unit_cost)*100);
    left-=restored;
    if(!left) break;
  }
  if(left) throw Error('Original sale batch allocation is incomplete');
  await connection.query('UPDATE order_returns SET fifo_cost_total=? WHERE id=?',[cost/100,returnId]);
}
module.exports={consume,returnCost};
