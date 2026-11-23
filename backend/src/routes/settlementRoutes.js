const express = require('express');
const router = express.Router();
const c = require('../controllers/settlementController');

router.post('/:courierCode/:id/reverse',require('../middleware/authMiddleware').restrictTo('owner'),async(req,res)=>{
 try{const data=await require('../models/settlementModel').reverseRemittance(req.params.courierCode,Number(req.params.id),req.body.reason,req.user.id);res.json({data})}
 catch(error){res.status(400).json({message:error.message})}
});
router.get('/collections',require('../middleware/authMiddleware').restrictTo('owner'),async(req,res)=>{
 const [rows]=await require('../config/db').query(`SELECT DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') AS business_receipt_date,
 r.id,l.delivery_id,o.order_number,l.amount,l.expected_amount,l.fifo_cost_total,l.recognized_fifo_cost,
 DATE_FORMAT(CONVERT_TZ(rev.reversed_at,@@session.time_zone,'+05:30'),'%Y-%m-%d') AS reversal_date
 FROM courier_remittances r JOIN courier_remittance_lines l ON l.remittance_id=r.id
 JOIN order_deliveries d ON d.id=l.delivery_id JOIN orders o ON o.id=d.order_id
 LEFT JOIN courier_remittance_reversals rev ON rev.remittance_id=r.id
 ORDER BY r.id,l.delivery_id`);
 const [credit]=await require('../config/db').query(`SELECT DATE_FORMAT(r.business_receipt_date,'%Y-%m-%d') AS business_receipt_date,
 CONCAT('credit-',r.id) AS id,CONCAT('credit-',r.order_id) AS delivery_id,o.order_number,r.merchandise_amount AS amount,
 r.merchandise_total AS expected_amount,r.fifo_cost_total,r.recognized_fifo_cost,DATE_FORMAT(rev.business_date,'%Y-%m-%d') AS reversal_date FROM credit_receipts r JOIN orders o ON o.id=r.order_id LEFT JOIN credit_receipt_reversals rev ON rev.receipt_id=r.id ORDER BY r.id`);
 res.json({data:require('../utils/collectionReport')([...rows,...credit])});

});
router.get('/summaries', c.getSummaries);
router.get('/backfill-preview', c.getBackfillPreview);
router.get('/:courierCode/history',async(req,res)=>{
  const data=await require('../models/settlementModel').getRemittances(req.params.courierCode);
  res.json({success:true,data});
});
router.get('/:courierCode/orders', c.getUnsettledOrders);
router.post('/:courierCode/preview', c.recordSettlement);
router.post('/:courierCode/settle', c.recordSettlement);

module.exports = router;
