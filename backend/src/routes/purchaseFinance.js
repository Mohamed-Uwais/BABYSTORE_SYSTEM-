const express=require('express');
const multer=require('multer');
const db=require('../config/db');
const router=express.Router();
router.get('/invoice-match',async(req,res)=>{
 const [rows]=await db.query('SELECT id,po_number FROM purchase_orders WHERE supplier_id=? AND invoice_reference=? ORDER BY id DESC LIMIT 5',[req.query.supplier_id,req.query.reference||'']);
 res.json({data:rows});
});
router.post('/:id/payments/:paymentId/reverse',require('../middleware/authMiddleware').restrictTo('owner'),async(req,res)=>{
 const reason=req.body.reason?.trim();
 if (!reason || reason.length>500) return res.status(400).json({message:'Enter a reversal reason (up to 500 characters)'});
 const conn=await db.getConnection();
 try {
   await conn.beginTransaction();
   const [[po]]=await conn.query('SELECT id FROM purchase_orders WHERE id=? FOR UPDATE',[req.params.id]);
   const [[payment]]=await conn.query('SELECT id FROM purchase_payments WHERE purchase_order_id=? AND id=?',[po?.id??null,req.params.paymentId]);
   if(!payment)throw Error('Unknown purchase payment');
   const [[prior]]=await conn.query('SELECT reason,reversed_by FROM purchase_payment_reversals WHERE payment_id=?',[payment.id]);
   if(prior && (prior.reason!==reason||prior.reversed_by!==req.user.id))throw Error('Payment already reversed');
   if(!prior)await conn.query('INSERT INTO purchase_payment_reversals(payment_id,reason,reversed_by) VALUES(?,?,?)',[payment.id,reason,req.user.id]);
   await conn.commit();res.json({success:true});
 }catch(e){await conn.rollback();res.status(400).json({message:e.message})}finally{conn.release()}
});
router.get('/staff',async(req,res)=>{
 const [rows]=await db.query('SELECT id,full_name FROM users WHERE is_active=1 ORDER BY full_name');
 res.json({data:rows});
});
router.post('/:id/payments',async(req,res)=>{
 const {charge_id=null,amount,method,account,paid_by,key}=req.body;
 if(!Number.isSafeInteger(amount)||amount<=0||!['cash','bank','card'].includes(method)||typeof account!=='string'||!account.trim()||account.length>100||!Number.isSafeInteger(paid_by)||!/^[-\w]{8,80}$/.test(key||''))return res.status(400).json({message:'Invalid payment details'});
 const conn=await db.getConnection();
 try{
   await conn.beginTransaction();
   const [[po]]=await conn.query('SELECT id,transport_charge,finance_tracked,status FROM purchase_orders WHERE id=? FOR UPDATE',[req.params.id]);
   if(!po)throw Error('Unknown purchase order');
   const [[prior]]=await conn.query('SELECT * FROM purchase_payments WHERE request_key=?',[key]);
   if(prior){
     if(+prior.purchase_order_id!==+po.id||prior.charge_id!==charge_id||Math.round(prior.amount*100)!==amount||prior.paid_by!==paid_by||prior.method!==method||prior.account!==account.trim())throw Error('Payment request changed on retry');
   }else{
     const [[staff]]=await conn.query('SELECT id FROM users WHERE id=? AND is_active=1',[paid_by]);
     if(!staff)throw Error('Choose an active registered payer');
     let obligation;
     if(charge_id){
       const [[charge]]=await conn.query('SELECT amount FROM purchase_receipt_charges WHERE purchase_order_id=? AND id=?',[po.id,charge_id]);
       if(!charge)throw Error('Unknown charge');obligation=charge.amount;
     }else{
       if(!po.finance_tracked||['placed','cancelled'].includes(po.status))throw Error('Confirmed invoice and known payment history required');
       const [[sum]]=await conn.query('SELECT SUM(quantity*unit_cost_price) AS value FROM purchase_order_items WHERE purchase_order_id=?',[po.id]);
       obligation=Number(sum.value)+Number(po.transport_charge);
     }
     const [[paid]]=await conn.query('SELECT COALESCE(SUM(amount),0) AS total FROM purchase_payments p LEFT JOIN purchase_payment_reversals r ON r.payment_id=p.id WHERE purchase_order_id=? AND charge_id <=> ? AND r.payment_id IS NULL',[po.id,charge_id]);
     if(amount>Math.round(obligation*100)-Math.round(paid.total*100))throw Error('Payment exceeds remaining balance');
     await conn.query('INSERT INTO purchase_payments(purchase_order_id,charge_id,amount,method,account,paid_by,operator_id,request_key) VALUES(?,?,?,?,?,?,?,?)',[po.id,charge_id,amount/100,method,account.trim(),paid_by,req.user.id,key]);
   }
   await conn.commit();res.json({success:true});
 }catch(e){await conn.rollback();res.status(400).json({message:e.message})}finally{conn.release()}
});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
router.post('/:id/invoice',upload.single('invoice'),async(req,res)=>{
 const b=req.file?.buffer;
 const mime=b?.subarray(0,5).equals(Buffer.from('%PDF-'))?'application/pdf':b?.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'image/png':b?.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))?'image/jpeg':null;
 if(!mime||mime!==req.file?.mimetype)return res.status(400).json({message:'Choose a JPG, PNG or PDF invoice'});
 await db.query('INSERT INTO purchase_invoices(purchase_order_id,mime,content,uploaded_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE mime=VALUES(mime),content=VALUES(content),uploaded_by=VALUES(uploaded_by),uploaded_at=CURRENT_TIMESTAMP',[req.params.id,mime,b,req.user.id]);
 res.json({success:true});
});
router.get('/:id/invoice',async(req,res)=>{
 const [[file]]=await db.query('SELECT mime,content FROM purchase_invoices WHERE purchase_order_id=?',[req.params.id]);
 if(!file)return res.status(404).json({message:'No invoice attached'});
 res.set('Cache-Control','no-store').set('X-Content-Type-Options','nosniff').type(file.mime).send(file.content);
});
module.exports=router;
