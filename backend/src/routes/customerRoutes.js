const express = require('express');
const router = express.Router();
const cc = require('../controllers/customerController');

router.get('/:id/orders/:orderId',async(req,res)=>{
 const db=require('../config/db');
 const [[linked]]=await db.query("SELECT id,DATE(CONVERT_TZ(created_at,@@session.time_zone,'+05:30'))<DATE(UTC_TIMESTAMP()+INTERVAL 330 MINUTE) AS older FROM orders WHERE id=? AND customer_id=?",[req.params.orderId,req.params.id]);
 if(!linked)return res.status(404).json({message:'Customer order not found'});
 if(!require('../middleware/salesScope').unrestricted(req.user)&&!linked.older){
   const allowed=await require('../utils/salesAccess').cashierBills(db);
   if(!allowed.some(o=>o.id===linked.id))return res.status(403).json({message:'Owner or administrator access required'});
 }
 const data=await require('../models/orderModel').getOrderById(linked.id);
 if(!require('../middleware/salesScope').unrestricted(req.user)){
   for(const item of data.items){delete item.fifo_cost_total;delete item.cost_price_snapshot}
   for(const item of data.returns)delete item.fifo_cost_total;
 }
 res.json({data});
});
router.get('/:id/receipts',async(req,res)=>{
 const [data]=await require('../config/db').query(`SELECT r.id,r.amount,r.method,r.receiving_account,
 DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') AS business_receipt_date,o.order_number,u.full_name AS staff,
 rev.reason AS reversal_reason,DATE_FORMAT(rev.business_date,'%Y-%m-%d') AS reversed_date
 FROM credit_receipts r JOIN orders o ON o.id=r.order_id JOIN users u ON u.id=r.staff_id
 LEFT JOIN credit_receipt_reversals rev ON rev.receipt_id=r.id WHERE r.customer_id=? ORDER BY r.id DESC`,[req.params.id]);
 res.json({data});
});
router.post('/:id/receipts/:receiptId/reverse',require('../middleware/authMiddleware').restrictTo('owner'),async(req,res)=>{
 try{const data=await require('../models/customerModel').reverseCreditReceipt(req.params.id,req.params.receiptId,req.body.reason,req.user.id);res.json({data})}
 catch(error){res.status(400).json({message:error.message})}
});
router.get('/', cc.listCustomers);
router.get('/search', cc.searchCustomers);
router.get('/phone/:phone', cc.lookupByPhone);
router.get('/:id', cc.getCustomer);
router.post('/', cc.addCustomer);
router.put('/:id', cc.updateCustomer);
router.patch('/:id/convert-loyalty', cc.convertToLoyalty);
router.post('/:id/repayment', cc.recordRepayment);

module.exports = router;
