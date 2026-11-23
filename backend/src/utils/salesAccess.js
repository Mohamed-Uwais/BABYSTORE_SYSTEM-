function cappedBills(rows, cap=5178500) {
  const visible=[];
  let total=0;
  for(const row of rows){
    const amount=Math.round(Number(row.grand_total)*100);
    if(!Number.isSafeInteger(amount)||amount<0||total+amount>cap)break;
    visible.push(row);total+=amount;
  }
  return visible;
}
async function cashierBills(db){
 const [rows]=await db.query(`SELECT o.id,o.order_number,o.created_at,o.status,o.channel,o.fulfillment_type,o.grand_total,o.delivery_fee,
 c.full_name AS customer_name,u.full_name AS cashier_name
 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN users u ON u.id=o.cashier_id
 WHERE DATE(CONVERT_TZ(o.created_at,@@session.time_zone,'+05:30'))=DATE(UTC_TIMESTAMP()+INTERVAL 330 MINUTE)
 AND o.status IN ('completed','delivered')
 ORDER BY o.created_at DESC,o.id DESC`);
 return cappedBills(rows);
}
module.exports={cappedBills,cashierBills};
