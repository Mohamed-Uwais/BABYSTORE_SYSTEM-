const db = require('../config/db');
const customerModel = require('./customerModel');

async function getCourierSummaries() {
  const [rows] = await db.query(`
    SELECT c.id AS courier_customer_id, c.full_name AS courier_name, c.phone AS courier_code,
           c.credit_balance AS outstanding,
           (SELECT COUNT(*) FROM order_deliveries od
            JOIN orders o ON o.id = od.order_id
            JOIN couriers cr ON cr.id = od.courier_id
            WHERE cr.code = LOWER(c.phone) AND od.settled = FALSE
              AND o.status NOT IN ('cancelled')) AS unsettled_orders,
           (SELECT MIN(o2.created_at) FROM order_deliveries od2
            JOIN orders o2 ON o2.id = od2.order_id
            JOIN couriers cr2 ON cr2.id = od2.courier_id
            WHERE cr2.code = LOWER(c.phone) AND od2.settled = FALSE
              AND o2.status NOT IN ('cancelled')) AS oldest_pending
    FROM customers c
    WHERE EXISTS (SELECT 1 FROM couriers registered WHERE UPPER(registered.code)=c.phone)
    ORDER BY c.full_name
  `);
  return rows.map(r => ({
    ...r,
    outstanding: Number(r.outstanding),
    days_pending: r.oldest_pending ? Math.floor((Date.now() - new Date(r.oldest_pending).getTime()) / 86400000) : 0,
  }));
}

async function getUnsettledOrders(courierCode) {
  const [rows] = await db.query(`
    SELECT o.id AS order_id, o.order_number, o.created_at AS ship_date,
           (SELECT SUM(l.credit_delta) FROM customer_ledger l JOIN customers a ON a.id=l.customer_id
             WHERE l.reference_type='order' AND l.reference_id=o.id AND l.entry_type='credit_issued' AND a.phone=UPPER(cr.code)) AS item_value,
           o.delivery_fee,
           (SELECT COALESCE(SUM(amount+courier_fee+other_deduction),0) FROM courier_remittance_lines l WHERE NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=l.remittance_id) AND delivery_id=od.id) AS remitted,
           od.id AS delivery_id, od.tracking_number,
           DATEDIFF(NOW(), o.created_at) AS days_pending
    FROM order_deliveries od
    JOIN orders o ON o.id = od.order_id
    JOIN couriers cr ON cr.id = od.courier_id
    WHERE cr.code = ? AND od.settled = FALSE
      AND o.status NOT IN ('cancelled','refunded','partially_refunded')
    ORDER BY o.created_at ASC
  `, [courierCode.toLowerCase()]);
  return rows.map(r => ({ ...r, item_value: r.item_value==null?null:Number(r.item_value), delivery_fee: Number(r.delivery_fee), settlement_status:Number(r.remitted)>0?'Partially settled':'Unsettled', remaining:Math.max(0,Math.round((Number(r.item_value)-Number(r.remitted))*100)/100) }));
}

async function recordSettlement({ courierCode, amount, deliveryIds, notes, userId, method, account, key, allocations, businessDate, sourceReceiptId, preview=false }) {
  const receiptDate=businessDate||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(receiptDate)||Number.isNaN(Date.parse(receiptDate))||new Date(receiptDate).toISOString().slice(0,10)!==receiptDate)throw Error('Enter a valid business receipt date');
  const cents=Math.round(amount*100);
  if(!Number.isSafeInteger(cents)||cents<=0||Math.abs(amount*100-cents)>0.00001)throw Error('Enter a positive remittance with up to two decimals');
  if(!Array.isArray(deliveryIds)||!deliveryIds.length||deliveryIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(deliveryIds).size!==deliveryIds.length)throw Error('Select the deliveries on the remittance');
  if(!['cash','bank_transfer','card'].includes(method)||typeof account!=='string'||!account.trim()||account.length>100)throw Error('Choose a receiving method and account');
  if(!preview && (typeof key!=='string'||!/^[-\w]{8,80}$/.test(key)))throw Error('Settlement submission key required');
  if(notes!=null && (typeof notes!=='string'||notes.length>500))throw Error('Reference must fit 500 characters');
  const hash=require('../utils/checkoutRequest').requestHash({courierCode,cents,deliveryIds:[...deliveryIds].sort((a,b)=>a-b),method,account,notes,allocations,receiptDate,sourceReceiptId});
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[courier]]=await conn.query('SELECT id FROM couriers WHERE code=? FOR UPDATE',[courierCode.toLowerCase()]);
    if(!courier)throw Error('Unknown courier');
    const requestKey=userId+':'+key;
    const [[prior]]=await conn.query('SELECT id,payload_hash FROM courier_remittances WHERE request_key=?',[requestKey]);
    if(prior && !preview) {
      if(prior.payload_hash!==hash)throw Error('Settlement request changed on retry');
      await conn.commit();return {id:prior.id};
    }
    let source=null;
    if(sourceReceiptId){
      const [[original]]=await conn.query(`SELECT r.*,DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') AS receipt_date_text,r.amount-
        (SELECT COALESCE(SUM(amount),0) FROM courier_remittance_lines WHERE remittance_id=r.id)-
        (SELECT COALESCE(SUM(l.amount),0) FROM courier_remittances child JOIN courier_remittance_lines l ON l.remittance_id=child.id
         WHERE child.source_remittance_id=r.id AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=child.id)) AS available
        FROM courier_remittances r WHERE r.id=? AND r.courier_id=? AND r.source_remittance_id IS NULL
        AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=r.id) FOR UPDATE`,[sourceReceiptId,courier.id]);
      if(!original||cents>Math.round(original.available*100))throw Error('Allocation exceeds unapplied receipt balance');
      if(!original.business_receipt_date)throw Error('Original business receipt date requires reconciliation');
      source=original;
    }
    const [[customer]]=await conn.query('SELECT id FROM customers WHERE phone=? FOR UPDATE',[courierCode.toUpperCase()]);
    if(!customer)throw Error('Courier ledger requires reconciliation');
    const [deliveries]=await conn.query(`SELECT d.id,d.settled,o.id AS order_id,o.delivery_fee,
      (SELECT COALESCE(SUM(retained_delivery),0) FROM courier_remittance_lines l WHERE delivery_id=d.id AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=l.remittance_id)) AS retained_delivery,
      (SELECT IF(COUNT(*)=COUNT(fifo_cost_total),SUM(fifo_cost_total),NULL) FROM order_items WHERE order_id=o.id) AS fifo_cost_total,
      (SELECT SUM(l.credit_delta) FROM customer_ledger l WHERE l.reference_type='order' AND l.reference_id=o.id AND l.customer_id=? AND l.entry_type='credit_issued') AS expected,
      (SELECT COALESCE(SUM(amount+courier_fee+other_deduction),0) FROM courier_remittance_lines l WHERE NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=l.remittance_id) AND delivery_id=d.id) AS remitted
      FROM order_deliveries d JOIN orders o ON o.id=d.order_id WHERE d.id IN (?) AND d.courier_id=? AND o.status NOT IN ('cancelled','refunded','partially_refunded')
      ORDER BY o.created_at,d.id FOR UPDATE`,[customer.id,deliveryIds,courier.id]);
    if(deliveries.length!==deliveryIds.length||deliveries.some(d=>d.settled||d.expected==null))throw Error('Select outstanding deliveries with a recorded courier obligation');
    const plan=require('../utils/settlementAllocation').allocateSettlement(amount,deliveries,allocations);
    if(source && plan.unapplied)throw Error('Apply the full requested amount from the original receipt');
    if(preview){await conn.commit();return plan;}
    const [receipt]=await conn.query('INSERT INTO courier_remittances(courier_id,amount,method,receiving_account,notes,staff_id,request_key,payload_hash,business_receipt_date,source_remittance_id) VALUES(?,?,?,?,?,?,?,?,?,?)',[courier.id,source?0:cents/100,source?.method||method,source?.receiving_account||account.trim(),notes||null,userId,requestKey,hash,source?.receipt_date_text||receiptDate,source?.id||null]);
    for(const allocation of plan.lines){
      if(!allocation.amount&&!allocation.courier_fee&&!allocation.other_deduction&&!allocation.retained_delivery)continue;
      const delivery=deliveries.find(d=>d.id===allocation.delivery_id);
        const [priorCosts]=await conn.query('SELECT amount+courier_fee+other_deduction AS amount,recognized_fifo_cost+recognized_deduction_cost AS recognized_fifo_cost FROM courier_remittance_lines l WHERE delivery_id=? AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=l.remittance_id)',[delivery.id]);
        const recognizedCost=require('../utils/collectionCost')(delivery.fifo_cost_total,delivery.expected,allocation.amount,priorCosts);
        const totalCost=require('../utils/collectionCost')(delivery.fifo_cost_total,delivery.expected,Math.round((allocation.amount+allocation.courier_fee+allocation.other_deduction)*100)/100,priorCosts);
      await conn.query('INSERT INTO courier_remittance_lines(remittance_id,delivery_id,expected_amount,amount,courier_fee,other_deduction,retained_delivery,deduction_reason,fifo_cost_total) VALUES(?,?,?,?,?,?,?,?,?)',[receipt.insertId,delivery.id,delivery.expected,allocation.amount,allocation.courier_fee,allocation.other_deduction,allocation.retained_delivery,allocation.deduction_reason,delivery.fifo_cost_total]);
        await conn.query('UPDATE courier_remittance_lines SET recognized_fifo_cost=?,recognized_deduction_cost=? WHERE remittance_id=? AND delivery_id=?',[recognizedCost,totalCost==null||recognizedCost==null?null:Math.round((totalCost-recognizedCost)*100)/100,receipt.insertId,delivery.id]);
      await conn.query('UPDATE order_deliveries SET settled=?,settled_at=? WHERE id=?',[allocation.status==='Settled',allocation.status==='Settled'?new Date():null,delivery.id]);
    }
    await customerModel.addLedgerEntry(conn,{customer_id:customer.id,entry_type:'credit_repaid',credit_delta:-plan.lines.reduce((sum,l)=>sum+l.amount+l.courier_fee+l.other_deduction,0),reference_type:'settlement',reference_id:receipt.insertId,notes:notes||'Courier remittance',created_by:userId});
    await conn.commit();return {id:receipt.insertId};
  } catch(error){await conn.rollback();throw error} finally {conn.release()}
}

async function getRemittances(courierCode) {
  const [rows]=await db.query(`SELECT r.id,r.source_remittance_id,r.received_at,DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') AS business_receipt_date,r.amount,r.method,r.receiving_account,r.notes,rev.reason AS reversal_reason,rev.reversed_at,
      CASE WHEN r.source_remittance_id IS NULL THEN r.amount-
      (SELECT COALESCE(SUM(amount),0) FROM courier_remittance_lines WHERE remittance_id=r.id)-
      (SELECT COALESCE(SUM(l.amount),0) FROM courier_remittances child JOIN courier_remittance_lines l ON l.remittance_id=child.id
       WHERE child.source_remittance_id=r.id AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=child.id))
      ELSE 0 END AS unapplied,
      u.full_name AS staff,o.order_number,d.tracking_number,l.amount AS applied,l.courier_fee,l.other_deduction,l.retained_delivery,l.deduction_reason
    FROM courier_remittances r JOIN couriers c ON c.id=r.courier_id JOIN users u ON u.id=r.staff_id
    LEFT JOIN courier_remittance_reversals rev ON rev.remittance_id=r.id
    LEFT JOIN courier_remittance_lines l ON l.remittance_id=r.id LEFT JOIN order_deliveries d ON d.id=l.delivery_id
    LEFT JOIN orders o ON o.id=d.order_id WHERE c.code=? ORDER BY r.received_at DESC,r.id DESC,d.id`,[courierCode]);
  const receipts=new Map();
  for(const {order_number,tracking_number,applied,courier_fee,other_deduction,retained_delivery,deduction_reason,...receipt} of rows){
    if(!receipts.has(receipt.id))receipts.set(receipt.id,{...receipt,deliveries:[]});
    receipts.get(receipt.id).deliveries.push({order_number,tracking_number,applied,courier_fee,other_deduction,retained_delivery,deduction_reason});
  }
  return [...receipts.values()];
}

async function reverseRemittance(courierCode,id,reason,userId) {
  if(typeof reason!=='string'||!reason.trim()||reason.length>500)throw Error('Enter a reversal reason');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [[courier]]=await conn.query('SELECT id FROM couriers WHERE code=? FOR UPDATE',[courierCode]);
    const [[receipt]]=await conn.query('SELECT id FROM courier_remittances WHERE id=? AND courier_id=? FOR UPDATE',[id,courier?.id??null]);
    if(!receipt)throw Error('Unknown remittance');
    const [[prior]]=await conn.query('SELECT reason,staff_id FROM courier_remittance_reversals WHERE remittance_id=?',[id]);
    if(prior){
      if(prior.reason!==reason.trim()||prior.staff_id!==userId)throw Error('Remittance already reversed');
      await conn.commit();return {success:true};
    }
    const [[dependent]]=await conn.query('SELECT id FROM courier_remittances child WHERE source_remittance_id=? AND NOT EXISTS(SELECT 1 FROM courier_remittance_reversals rev WHERE rev.remittance_id=child.id) LIMIT 1',[id]);
    if(dependent)throw Error('Reverse the later allocations before reversing their original receipt');
    const [lines]=await conn.query('SELECT delivery_id,(amount+courier_fee+other_deduction) AS amount FROM courier_remittance_lines WHERE remittance_id=?',[id]);
    const [[customer]]=await conn.query('SELECT id FROM customers WHERE phone=? FOR UPDATE',[courierCode.toUpperCase()]);
    if(!customer)throw Error('Courier ledger missing');
    await conn.query('INSERT INTO courier_remittance_reversals(remittance_id,reason,staff_id) VALUES(?,?,?)',[id,reason.trim(),userId]);
    for(const line of lines)await conn.query('UPDATE order_deliveries SET settled=0,settled_at=NULL WHERE id=?',[line.delivery_id]);
    const allocated=lines.reduce((sum,l)=>sum+Math.round(l.amount*100),0)/100;
    if(allocated)await customerModel.addLedgerEntry(conn,{customer_id:customer.id,entry_type:'credit_issued',credit_delta:allocated,reference_type:'settlement_reversal',reference_id:id,notes:reason.trim(),created_by:userId});
    await conn.commit();return {success:true};
  }catch(error){await conn.rollback();throw error}finally{conn.release()}
}

async function getBackfillPreview() {
  const [rows] = await db.query(`
    SELECT o.id AS order_id, o.order_number, o.created_at,
           (o.subtotal - o.discount_total) AS item_value,
           cr.name AS courier_name, cr.code AS courier_code,
           EXISTS(SELECT 1 FROM customer_ledger cl
             JOIN customers cust ON cust.id = cl.customer_id AND cust.phone = UPPER(cr.code)
             WHERE cl.reference_type = 'order' AND cl.reference_id = o.id
               AND cl.entry_type = 'credit_issued') AS has_ledger_entry
    FROM order_deliveries od
    JOIN orders o ON o.id = od.order_id
    JOIN couriers cr ON cr.id = od.courier_id
    WHERE o.status NOT IN ('cancelled')
    ORDER BY o.created_at DESC
  `);
  const missing = rows.filter(r => !r.has_ledger_entry);
  return {
    total_courier_orders: rows.length,
    already_tracked: rows.length - missing.length,
    missing_entries: missing.map(r => ({
      order_id: r.order_id,
      order_number: r.order_number,
      date: r.created_at,
      courier: r.courier_name,
      item_value: Number(r.item_value),
    })),
  };
}

module.exports = { getCourierSummaries, getUnsettledOrders, recordSettlement, reverseRemittance, getRemittances, getBackfillPreview };
