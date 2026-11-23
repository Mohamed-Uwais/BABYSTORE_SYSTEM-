const db = require('../config/db');

// All adjustments lock the same variant as FIFO sales and retain immutable batch evidence.
async function adjustStock(input) {
  const data=require('../utils/inventoryAdjustment').validateAdjustment(input);
  const {variant_id,created_by,reason,submission_key}=data;
  const hash=require('crypto').createHash('sha256').update(JSON.stringify({variant_id:Number(variant_id),count:data.count,value:data.value,expected_stock:data.expected_stock,reason,unit_cost:data.unit_cost??null})).digest('hex');
  const key=created_by+':'+submission_key;
  const connection=await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[variant]]=await connection.query('SELECT current_stock FROM product_variants WHERE id=? FOR UPDATE',[variant_id]);
    if(!variant)throw Error('Variant not found');
    const [[prior]]=await connection.query('SELECT * FROM inventory_adjustments WHERE submission_key=?',[key]);
    if(prior){
      if(prior.request_hash!==hash)throw Error('Submission key belongs to a different adjustment');
      await connection.commit();return {variant_id,change_qty:prior.change_qty,new_stock:prior.resulting_stock,replayed:true};
    }
    const before=Number(variant.current_stock);
    if(data.count&&before!==Number(data.expected_stock))throw Error('Stock changed since this count was opened. Reload and recount before saving.');
    const qty=data.count?data.value-before:data.value;
    const after=before+qty;
    if(after<0)throw Error('Adjustment would take stock below zero');
    const [batches]=await connection.query('SELECT id,quantity_remaining,unit_cost FROM stock_batches WHERE variant_id=? AND quantity_remaining>0 ORDER BY received_at,id FOR UPDATE',[variant_id]);
    if(batches.reduce((n,b)=>n+Number(b.quantity_remaining),0)!==before)throw Error('Existing stock lacks matching receipt evidence. Reconcile historical batches before adjusting.');
    const allocations=[];
    if(qty>0){
      if(data.unit_cost==null||data.unit_cost==='')throw Error('Adding stock requires its evidenced actual unit cost. Use Purchasing for supplier receipts.');
      const cost=Math.round(Number(data.unit_cost)*100)/100;
      const [batch]=await connection.query('INSERT INTO stock_batches(variant_id,quantity_received,quantity_remaining,unit_cost) VALUES(?,?,?,?)',[variant_id,qty,qty,cost]);
      allocations.push({batch_id:batch.insertId,quantity:qty,unit_cost:cost});
    }else{
      let remaining=-qty;
      for(const batch of batches){
        if(!remaining)break;
        const used=Math.min(remaining,Number(batch.quantity_remaining));
        await connection.query('UPDATE stock_batches SET quantity_remaining=quantity_remaining-? WHERE id=?',[used,batch.id]);
        allocations.push({batch_id:batch.id,quantity:-used,unit_cost:batch.unit_cost});remaining-=used;
      }
    }
    const [record]=await connection.query('INSERT INTO inventory_adjustments(variant_id,submission_key,request_hash,change_qty,previous_stock,resulting_stock,reason,batch_allocations,created_by) VALUES(?,?,?,?,?,?,?,?,?)',[variant_id,key,hash,qty,before,after,reason,JSON.stringify(allocations),created_by]);
    await connection.query('UPDATE product_variants SET current_stock=? WHERE id=?',[after,variant_id]);
    await connection.query("INSERT INTO stock_movements(variant_id,change_qty,reason,reference_type,reference_id,created_by) VALUES(?,?,'manual_adjustment','inventory_adjustment',?,?)",[variant_id,qty,record.insertId,created_by]);
    await connection.commit();return {variant_id,change_qty:qty,new_stock:after};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

async function getMovements(variant_id, limit = 50) {
  const [rows] = await db.query(
    `SELECT sm.*, ia.reason AS adjustment_reason, u.full_name AS created_by_name
     FROM stock_movements sm
     LEFT JOIN users u ON u.id = sm.created_by
     LEFT JOIN inventory_adjustments ia ON sm.reference_type='inventory_adjustment' AND ia.id=sm.reference_id
     WHERE sm.variant_id = ?
     ORDER BY sm.created_at DESC
     LIMIT ?`,
    [variant_id, limit]
  );
  return rows;
}

async function stockToggle(input) { return adjustStock(input); }

async function batchEvidence(variantId) {
  const [[variant]]=await db.query('SELECT current_stock FROM product_variants WHERE id=?',[variantId]);
  if(!variant)throw Error('Variant not found');
  const [batches]=await db.query('SELECT id,quantity_received,quantity_remaining,unit_cost,received_at,purchase_order_id FROM stock_batches WHERE variant_id=? ORDER BY received_at,id',[variantId]);
  const documented=batches.reduce((n,b)=>n+Number(b.quantity_remaining),0);
  return {physical_stock:Number(variant.current_stock),documented_stock:documented,undocumented_stock:Number(variant.current_stock)-documented,batches};
}

async function reconcileStock(input) {
  const {variant_id,created_by,reason,batches,submission_key}=input;
  if(typeof reason!=='string'||!reason.trim()||reason.length>500||!Array.isArray(batches)||!batches.length||batches.length>100)throw Error('Provide the original receipt evidence and batches for undocumented stock');
  if(typeof submission_key!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(submission_key))throw Error('A reconciliation submission key is required');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo'}).format(new Date());
  for(const b of batches){
    if(!Number.isSafeInteger(b.quantity)||b.quantity<=0||b.unit_cost==null||b.unit_cost===''||typeof b.unit_cost==='boolean'||!Number.isFinite(Number(b.unit_cost))||Number(b.unit_cost)<0||Number(b.unit_cost)>99999999.99)throw Error('Every batch needs a positive whole quantity and evidenced actual unit cost');
    if(typeof b.received_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.received_date)||!Number.isFinite(Date.parse(b.received_date))||new Date(b.received_date).toISOString().slice(0,10)!==b.received_date||b.received_date>today)throw Error('Provide each original receipt date, no later than today');
  }
  const key=created_by+':r:'+submission_key;
  const hash=require('crypto').createHash('sha256').update(JSON.stringify({variant_id,reason,batches})).digest('hex');
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const [[variant]]=await connection.query('SELECT current_stock FROM product_variants WHERE id=? FOR UPDATE',[variant_id]);
    if(!variant)throw Error('Variant not found');
    const [[prior]]=await connection.query('SELECT request_hash FROM inventory_adjustments WHERE submission_key=?',[key]);
    if(prior){if(prior.request_hash!==hash)throw Error('Reconciliation key belongs to different evidence');await connection.commit();return {replayed:true};}
    const [existing]=await connection.query('SELECT id,quantity_remaining FROM stock_batches WHERE variant_id=? ORDER BY received_at,id FOR UPDATE',[variant_id]);
    const missing=Number(variant.current_stock)-existing.reduce((n,b)=>n+Number(b.quantity_remaining),0);
    if(missing<=0||batches.reduce((n,b)=>n+b.quantity,0)!==missing)throw Error('Evidence quantities must match exactly the undocumented stock. Reload before submitting.');
    const allocations=[];
    for(const b of batches){
      const [r]=await connection.query("INSERT INTO stock_batches(variant_id,quantity_received,quantity_remaining,unit_cost,received_at) VALUES(?,?,?,?,CONVERT_TZ(CONCAT(?,' 00:00:00'),'+05:30',@@session.time_zone))",[variant_id,b.quantity,b.quantity,Math.round(Number(b.unit_cost)*100)/100,b.received_date]);
      allocations.push({batch_id:r.insertId,...b});
    }
    const [record]=await connection.query('INSERT INTO inventory_adjustments(variant_id,submission_key,request_hash,change_qty,previous_stock,resulting_stock,reason,batch_allocations,created_by) VALUES(?,?,?,0,?,?,?,?,?)',[variant_id,key,hash,variant.current_stock,variant.current_stock,reason.trim(),JSON.stringify(allocations),created_by]);
    await connection.query("INSERT INTO stock_movements(variant_id,change_qty,reason,reference_type,reference_id,created_by) VALUES(?,0,'manual_adjustment','inventory_adjustment',?,?)",[variant_id,record.insertId,created_by]);
    await connection.commit();return {reconciled_quantity:missing};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

async function getAllVariantsSimple() {
  const [rows] = await db.query(`
    SELECT pv.id AS variant_id, pv.sku, pv.variant_label, pv.current_stock,
           p.name AS product_name, p.id AS product_id
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = TRUE AND p.is_active = TRUE
    ORDER BY p.name ASC, pv.variant_label ASC
  `);
  return rows;
}

module.exports = { adjustStock, getMovements, stockToggle, getAllVariantsSimple, batchEvidence, reconcileStock };
