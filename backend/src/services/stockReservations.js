// Every caller must lock the product_variants row first. This serializes shop
// sales, website holds, acceptance and adjustments on the same stock record.
async function reserved(connection,variantId,excludingOrder=0){
  const [[row]]=await connection.query(`SELECT COALESCE(SUM(quantity),0) AS reserved FROM website_stock_reservations
    WHERE variant_id=? AND state='active' AND order_id<>? FOR UPDATE`,[variantId,excludingOrder]);
  return Number(row?.reserved)||0;
}
async function reserve(connection,orderId,quantities){
  for(const [variantId,quantity] of quantities)await connection.query('INSERT INTO website_stock_reservations (order_id,variant_id,quantity) VALUES (?,?,?)',[orderId,variantId,quantity]);
}
async function finish(connection,orderId,state){
  if(!['consumed','released'].includes(state))throw Error('Invalid reservation state');
  await connection.query("UPDATE website_stock_reservations SET state=? WHERE order_id=? AND state='active'",[state,orderId]);
}
module.exports={reserved,reserve,finish};
