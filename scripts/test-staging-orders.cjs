const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
(async()=>{
 const db=await require('./staging-connection.cjs').connect();
 const ids={};const suffix=randomUUID().slice(0,8);let token;
 const api=async(route,body,auth=false,key)=>{
  const response=await fetch(`http://127.0.0.1:15001/api${route}`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{}) ,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  return {status:response.status,...await response.json()};
 };
 try{
  const account=await require('./staging-test-user.cjs').create(db);ids.user=account.id;
  const login=await api('/auth/login',account);assert.equal(login.status,200);token=login.data.token;
  const phone='07'+String(Math.floor(Math.random()*1e8)).padStart(8,'0');
  ids.customer=(await db.query("INSERT INTO customers (full_name,phone,customer_type) VALUES (?,?,'walk_in')",[`TEST Orders ${suffix}`,phone]))[0].insertId;
  ids.category=(await db.query('INSERT INTO categories (name,slug) VALUES (?,?)',[`TEST Orders ${suffix}`,`orders-${suffix}`]))[0].insertId;
  ids.product=(await db.query('INSERT INTO products (category_id,name,slug) VALUES (?,?,?)',[ids.category,`TEST Orders ${suffix}`,`orders-${suffix}`]))[0].insertId;
  ids.variant=(await db.query('INSERT INTO product_variants (product_id,sku,variant_label,retail_price,current_stock) VALUES (?,?,?,100,3)',[ids.product,`ORDER-${suffix}`,'Test pack']))[0].insertId;
  const web={phone,full_name:`TEST Orders ${suffix}`,fulfillment_type:'pickup',items:[{variantId:ids.variant,qty:2,price:1}],payment_method:'cod'};
  const quote=await api('/public/cart/quote',web);assert.equal(quote.status,200);assert.equal(quote.data.grand_total,200);
  const changed=await api('/public/checkout',{...web,expected_total:1},false,randomUUID());
  assert.equal(changed.status,409);assert.equal(changed.data.quote.grand_total,200);
  assert.equal((await api('/public/checkout',{...web,expected_total:200,quote_signature:'outdated'},false,randomUUID())).status,409);
  await db.query('UPDATE product_variants SET current_stock=1 WHERE id=?',[ids.variant]);
  const unavailable=await api('/public/checkout',{...web,expected_total:200,quote_signature:quote.data.signature},false,randomUUID());
  assert.equal(unavailable.status,400);assert.match(unavailable.message,/Insufficient stock/);
  await db.query('UPDATE product_variants SET current_stock=3 WHERE id=?',[ids.variant]);
  const key=randomUUID();const results=await Promise.all([api('/public/checkout',web,false,key),api('/public/checkout',web,false,key)]);
  for(const result of results)assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(results[0].data.orderId,results[1].data.orderId);
  const first=results[0].data.orderId;
  const state=async()=>{const [[row]]=await db.query("SELECT current_stock,(SELECT COALESCE(SUM(quantity),0) FROM website_stock_reservations WHERE variant_id=? AND state='active') AS reserved FROM product_variants WHERE id=?",[ids.variant,ids.variant]);return {stock:Number(row.current_stock),reserved:Number(row.reserved)};};
  assert.deepEqual(await state(),{stock:3,reserved:2});
  const pos=quantity=>({channel:'pos',customer_id:ids.customer,items:[{variant_id:ids.variant,quantity,unit_price:100}],payments:[{payment_method:'cash',amount:quantity*100}],fulfillment_type:'pickup'});
  assert.equal((await api('/orders/checkout',pos(2),true,randomUUID())).status,400);
  assert.equal((await api('/orders/checkout',pos(1),true,randomUUID())).status,201);
  assert.deepEqual(await state(),{stock:2,reserved:2});
  for(let i=0;i<2;i++)assert.equal((await api(`/orders/${first}/reject`,{reason:'Synthetic cancellation'},true)).status,200);
  assert.deepEqual(await state(),{stock:2,reserved:0});
  const competition=await Promise.all([api('/public/checkout',web,false,randomUUID()),api('/public/checkout',web,false,randomUUID())]);
  assert.equal(competition.filter(result=>result.status===200).length,1,JSON.stringify(competition));
  assert.equal(competition.filter(result=>result.status===400).length,1);
  const second=competition.find(result=>result.status===200).data.orderId;
  const accepted=await Promise.all([api(`/orders/${second}/accept`,{},true),api(`/orders/${second}/accept`,{},true)]);
  for(const result of accepted)assert.equal(result.status,200,JSON.stringify(result));
  assert.deepEqual(await state(),{stock:0,reserved:0});
  const [[movement]]=await db.query("SELECT COUNT(*) AS count,SUM(change_qty) AS change_qty FROM stock_movements WHERE reference_type='order' AND reference_id=? AND reason='sale'",[second]);
  assert.equal(Number(movement.count),1);assert.equal(Number(movement.change_qty),-2);
  assert.equal((await api('/public/checkout',web,false,key)).data.orderId,first,'lost response replay remains stable after cancellation');
  await db.query('UPDATE product_variants SET current_stock=3 WHERE id=?',[ids.variant]);
  ids.zone=(await db.query('INSERT INTO delivery_zones (zone_name,base_fee,per_additional_pack_fee,is_active) VALUES (?,350,75,1)',[`TEST Zone ${suffix}`]))[0].insertId;
  const delivery=await api('/public/checkout',{...web,fulfillment_type:'delivery',delivery_address:'Synthetic test address',delivery_zone_id:ids.zone,delivery_fee:0},false,randomUUID());
  assert.equal(delivery.status,200,JSON.stringify(delivery));
  const [[order]]=await db.query('SELECT subtotal,delivery_fee,grand_total FROM orders WHERE id=?',[delivery.data.orderId]);
  assert.deepEqual([order.subtotal,order.delivery_fee,order.grand_total].map(Number),[200,425,625]);
  const repeat=await api('/public/repeat-order',{order_number:results[0].data.order_number,phone});
  assert.equal(repeat.status,200,JSON.stringify(repeat));assert.equal(repeat.data.items[0].qty,1);assert.equal(repeat.data.items[0].reduced,true);
  assert.equal(Number(repeat.data.items[0].variant.discounted_price),100);
  assert.equal((await api('/public/repeat-order',{order_number:results[0].data.order_number,phone:'0111234567'})).status,404);
  for(const accepted of [phone,phone.slice(1),'94'+phone.slice(1),'+94'+phone.slice(1),phone.slice(0,3)+' '+phone.slice(3,6)+'-'+phone.slice(6)]){
    const response=await fetch(`http://127.0.0.1:15001/api/public/track?${new URLSearchParams({order_number:results[0].data.order_number,phone:accepted})}`);
    assert.equal(response.status,200);const data=(await response.json()).data;
    assert.equal(data.customer_name,undefined);assert.equal(data.payments,undefined);assert.equal(data.delivery?.receiver_phone,undefined);
  }
  const unverified=await fetch(`http://127.0.0.1:15001/api/public/track?order_number=${encodeURIComponent(results[0].data.order_number)}`);
  assert.equal(unverified.status,400);
  console.log('PASS: real concurrent web retries, competing purchases, POS versus reserved stock, repeat cancellation, concurrent acceptance with one deduction, replay after cancellation, server prices and existing delivery-charge calculation.');
 }finally{
  try {
  if(ids.customer){
   const [orders]=await db.query('SELECT id FROM orders WHERE customer_id=?',[ids.customer]);const orderIds=orders.map(row=>row.id);
   if(orderIds.length){
    await db.query("DELETE FROM stock_movements WHERE reference_type='order' AND reference_id IN (?)",[orderIds]);
    await db.query('DELETE FROM checkout_requests WHERE order_id IN (?)',[orderIds]);
    await db.query('DELETE FROM customer_ledger WHERE customer_id=?',[ids.customer]);
    await db.query('DELETE FROM order_status_history WHERE order_id IN (?)',[orderIds]);
    await db.query('DELETE FROM promotion_usage WHERE order_id IN (?)',[orderIds]);
    await db.query('DELETE FROM orders WHERE id IN (?)',[orderIds]);
   }
   await db.query('DELETE FROM customers WHERE id=?',[ids.customer]);
  }
  if(ids.product)await db.query('DELETE FROM products WHERE id=?',[ids.product]);
  if(ids.category)await db.query('DELETE FROM categories WHERE id=?',[ids.category]);
  if(ids.zone)await db.query('DELETE FROM delivery_zones WHERE id=?',[ids.zone]);
  if(ids.user)await db.query('DELETE FROM users WHERE id=?',[ids.user]);
  } finally { await db.end(); }
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
