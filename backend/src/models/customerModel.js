const db = require('../config/db');
const fin = require('./financialEngine');

async function getAllCustomers() {
  const [rows] = await db.query(`
    SELECT c.*,
           COUNT(DISTINCT o.id) AS total_orders,
           COALESCE(SUM(${fin.NET_REVENUE_SUBQUERY}), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.status IN ${fin.SETTLED}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return rows.map(r => ({ ...r, total_spent: Number(r.total_spent), credit_balance: Number(r.credit_balance) }));
}

async function getCustomerById(id) {
  const [[customer]] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
  if (!customer) return null;

  const [[stats]] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           COALESCE(SUM(sub.net_rev), 0) AS total_spent
    FROM (
      SELECT o.id,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price - COALESCE(oi.discount_amount, 0)), 0)
         FROM order_items oi WHERE oi.order_id = o.id)
        - COALESCE((SELECT SUM(r.quantity * oi2.unit_price)
           FROM order_returns r JOIN order_items oi2 ON oi2.id = r.order_item_id
           WHERE r.order_id = o.id), 0) AS net_rev
      FROM orders o
      WHERE o.customer_id = ? AND o.status IN ${fin.SETTLED}
    ) sub
  `, [id]);

  const [orders] = await db.query(`
    SELECT id, order_number, status, grand_total, created_at
    FROM orders WHERE customer_id = ? ORDER BY created_at DESC
  `, [id]);

  const [ledger] = await db.query(`
    SELECT cl.*, u.full_name AS created_by_name
    FROM customer_ledger cl
    LEFT JOIN users u ON u.id = cl.created_by
    WHERE cl.customer_id = ? ORDER BY cl.created_at DESC
  `, [id]);

  return {
    ...customer,
    credit_balance: Number(customer.credit_balance),
    total_orders: stats.total_orders,
    total_spent: Number(stats.total_spent),
    orders: orders.map(o => ({ ...o, grand_total: Number(o.grand_total) })),
    ledger: ledger.map(l => ({ ...l, credit_delta: Number(l.credit_delta) })),
  };
}

async function getCustomerByPhone(phone) {
  const [rows] = await db.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  return rows[0] || null;
}

async function findOrCreateCustomer({ phone, full_name, email, address, city, customer_type, source_channel }) {
  const existing = await getCustomerByPhone(phone);
  if (existing) return existing;

  const [result] = await db.query(
    `INSERT INTO customers (phone, full_name, email, address, city, customer_type, source_channel)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [phone, full_name || null, email || null, address || null, city || null,
     customer_type || 'walk_in', source_channel || 'pos']
  );

  return getCustomerByPhone(phone) ?? { id: result.insertId, phone };
}

async function updateCustomer(id, data) {
  const { full_name, phone, email, address, city } = data;
  await db.query(
    `UPDATE customers SET full_name = ?, phone = ?, email = ?, address = ?, city = ? WHERE id = ?`,
    [full_name || null, phone, email || null, address || null, city || null, id]
  );
  return getCustomerById(id);
}

async function convertToLoyalty(id) {
  const [[customer]] = await db.query('SELECT customer_type FROM customers WHERE id = ?', [id]);
  if (!customer) throw new Error('Customer not found');
  if (customer.customer_type === 'loyalty') throw new Error('Customer is already a loyalty member');

  await db.query(
    `UPDATE customers SET customer_type = 'loyalty', loyalty_tier = 'silver' WHERE id = ?`,
    [id]
  );
  return getCustomerById(id);
}

async function recordCreditRepayment(customerId, amount, notes, createdBy, options={}) {
  const {moneyCents}=require('../utils/settlementAllocation');
  const cents=moneyCents(amount,'repayment');
  const {order_id,method,account,business_receipt_date,key}=options;
  if(!cents||!Number.isSafeInteger(order_id)||!['cash','card','bank_transfer'].includes(method)||typeof account!=='string'||!account.trim()||account.length>100)throw Error('Choose an original bill, payment method and receiving account');
  if(typeof key!=='string'||!/^[-\w]{8,80}$/.test(key))throw Error('Repayment submission key required');
  const date=business_receipt_date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Enter the business receipt date');
  const hash=require('../utils/checkoutRequest').requestHash({customerId,cents,notes,order_id,method,account,date});
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const [[customer]]=await connection.query('SELECT credit_balance FROM customers WHERE id=? FOR UPDATE',[customerId]);
    if(!customer)throw Error('Customer not found');
    const requestKey=createdBy+':'+key;
    const [[prior]]=await connection.query('SELECT payload_hash FROM credit_receipts WHERE request_key=?',[requestKey]);
    if(prior){
      if(prior.payload_hash!==hash)throw Error('Repayment changed on retry');
      await connection.commit();return getCustomerById(customerId);
    }
    if(cents>moneyCents(customer.credit_balance,'outstanding balance'))throw Error('Repayment exceeds remaining customer debt');
    const [[order]]=await connection.query(`SELECT o.*,
      (SELECT SUM(amount) FROM order_payments WHERE order_id=o.id AND payment_method='pay_later') AS credit,
      (SELECT COALESCE(SUM(amount),0) FROM credit_receipts r WHERE order_id=o.id AND NOT EXISTS(SELECT 1 FROM credit_receipt_reversals rev WHERE rev.receipt_id=r.id)) AS repaid,
      (SELECT IF(COUNT(*)=COUNT(fifo_cost_total),SUM(fifo_cost_total),NULL) FROM order_items WHERE order_id=o.id) AS fifo
      FROM orders o WHERE o.id=? AND o.customer_id=? FOR UPDATE`,[order_id,customerId]);
    if(!order||!order.credit||['cancelled','refunded','partially_refunded'].includes(order.status))throw Error('Select an outstanding original credit bill');
    const [[legacy]]=await connection.query("SELECT id FROM customer_ledger WHERE customer_id=? AND entry_type='credit_repaid' AND reference_type='manual' LIMIT 1",[customerId]);
    if(legacy)throw Error('Historical repayments need bill allocation reconciliation before collecting against this bill');
    if(cents>moneyCents(order.credit,'bill credit')-moneyCents(order.repaid,'prior payments'))throw Error('Repayment exceeds remaining bill debt');
    const merchandise=Math.max(0,Math.round((Number(order.grand_total)-Number(order.delivery_fee))*100));
    const gross=moneyCents(order.grand_total,'bill total');
    const [initialPayments]=await connection.query('SELECT id,payment_method,amount FROM order_payments WHERE order_id=? ORDER BY id',[order_id]);
    const initialCollections=require('../utils/counterCollections').counterCollections({...order,fifo_cost_total:order.fifo},initialPayments);
    const initialReceived=initialCollections.reduce((n,p)=>n+moneyCents(p.amount,'initial receipt'),0);
    const previous=moneyCents(order.repaid,'prior payments')+initialReceived;
    const allocated=Math.round((previous+cents)*merchandise/gross)-Math.round(previous*merchandise/gross);
      const [priorCosts]=await connection.query('SELECT merchandise_amount AS amount,recognized_fifo_cost FROM credit_receipts r WHERE order_id=? AND NOT EXISTS(SELECT 1 FROM credit_receipt_reversals rev WHERE rev.receipt_id=r.id)',[order_id]);
        const recognizedCost=require('../utils/collectionCost')(order.fifo,merchandise/100,allocated/100,[...initialCollections.map(p=>({amount:p.merchandise_amount,recognized_fifo_cost:p.recognized_fifo_cost})),...priorCosts]);
    const [receipt]=await connection.query(`INSERT INTO credit_receipts(customer_id,order_id,amount,method,receiving_account,business_receipt_date,staff_id,notes,request_key,payload_hash,merchandise_amount,merchandise_total,fifo_cost_total)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[customerId,order_id,cents/100,method,account.trim(),date,createdBy,notes||null,requestKey,hash,allocated/100,merchandise/100,order.fifo]);
      await connection.query('UPDATE credit_receipts SET recognized_fifo_cost=? WHERE id=?',[recognizedCost,receipt.insertId]);
    await addLedgerEntry(connection,{customer_id:customerId,entry_type:'credit_repaid',credit_delta:-cents/100,reference_type:'credit_receipt',reference_id:receipt.insertId,notes,created_by:createdBy});
    await connection.commit();return getCustomerById(customerId);
  }catch(error){await connection.rollback();throw error}finally{connection.release()}
}

async function reverseCreditReceipt(customerId,receiptId,reason,staffId) {
  if(typeof reason!=='string'||!reason.trim()||reason.length>500)throw Error('A reversal reason is required');
  const connection=await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[customer]]=await connection.query('SELECT id FROM customers WHERE id=? FOR UPDATE',[customerId]);
    if(!customer)throw Error('Customer not found');
    const [[receipt]]=await connection.query('SELECT * FROM credit_receipts WHERE id=? AND customer_id=? FOR UPDATE',[receiptId,customerId]);
    if(!receipt)throw Error('Receipt not found');
    const [[prior]]=await connection.query('SELECT reason,staff_id FROM credit_receipt_reversals WHERE receipt_id=?',[receiptId]);
    if(prior){
      if(prior.reason!==reason.trim()||prior.staff_id!==staffId)throw Error('Receipt already reversed');
      await connection.commit();return {success:true};
    }
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    await connection.query('INSERT INTO credit_receipt_reversals(receipt_id,reason,staff_id,business_date) VALUES(?,?,?,?)',[receiptId,reason.trim(),staffId,date]);
    await addLedgerEntry(connection,{customer_id:customerId,entry_type:'credit_issued',credit_delta:Number(receipt.amount),reference_type:'credit_receipt_reversal',reference_id:receiptId,notes:reason.trim(),created_by:staffId});
    await connection.commit();return {success:true};
  }catch(error){await connection.rollback();throw error}finally{connection.release()}
}

async function addLedgerEntry(connection, {
  customer_id, entry_type, points_delta = 0, credit_delta = 0,
  reference_type, reference_id, notes, created_by
}) {
  await connection.query(
    `INSERT INTO customer_ledger
      (customer_id, entry_type, points_delta, credit_delta, reference_type, reference_id, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, entry_type, points_delta, credit_delta, reference_type || null,
     reference_id || null, notes || null, created_by || null]
  );

  await connection.query(
    `UPDATE customers
     SET loyalty_points_balance = loyalty_points_balance + ?,
         credit_balance = credit_balance + ?
     WHERE id = ?`,
    [points_delta, credit_delta, customer_id]
  );
}

module.exports = {
  getAllCustomers, getCustomerById, getCustomerByPhone,
  findOrCreateCustomer, updateCustomer, convertToLoyalty,
  recordCreditRepayment, reverseCreditReceipt, addLedgerEntry,
};
