const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requirePermission, restrictTo } = require('../middleware/authMiddleware');

const {salesScope,requireBill}=require('../middleware/salesScope');
router.use(salesScope);
router.use(require('../utils/financialVisibility').hideCosts);
router.get('/best-sellers', orderController.bestSellers);
router.get('/search-for-return', requirePermission('refunds'), orderController.searchForReturn);
router.get('/pending', orderController.getPendingOrders);
router.get('/', orderController.listOrders);
router.get('/:id', requireBill, orderController.getOrder);
router.get('/:id/returns', requireBill, orderController.getReturns);
router.get('/:id/return-items', requireBill, requirePermission('refunds'), orderController.getReturnItems);
router.post('/:id/refund-allocation', restrictTo('owner'), async (req,res,next)=>{
  const db = require('../config/db');
  const {reason,amounts}=req.body;
  if(typeof reason!=='string'||!reason.trim()||reason.length>500||!Array.isArray(amounts))return res.status(400).json({message:'Enter the evidence and paid amount for every line'});
  const connection=await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[bill]]=await connection.query('SELECT discount_total FROM orders WHERE id=? FOR UPDATE',[req.params.id]);
    if(!bill)throw Error('Order not found');
    const [lines]=await connection.query('SELECT i.id,i.line_total,i.refund_paid_amount,COALESCE((SELECT SUM(r.refund_amount) FROM order_returns r WHERE r.order_item_id=i.id),0) refunded FROM order_items i WHERE i.order_id=?',[req.params.id]);
    if(!lines.length || lines.some(l=>l.refund_paid_amount!=null) || lines.length!==amounts.length)throw Error('Review requires an unresolved bill and all its lines');
    let sum=0,gross=0;
    for(const line of lines){
      const amount=amounts.find(a=>a.id===line.id)?.cents;
      const value=Math.round(Number(line.line_total)*100);
      if(!Number.isSafeInteger(amount)||amount<Math.round(line.refunded*100)||amount>value)throw Error('Approved value must cover prior refunds and fit the original line');
      sum+=amount;gross+=value;
      await connection.query('UPDATE order_items SET refund_paid_amount=? WHERE id=?',[amount/100,line.id]);
    }
    if(sum!==gross-Math.round(bill.discount_total*100))throw Error('Approved amounts must reconcile to the original merchandise total');
    await connection.query('INSERT INTO refund_allocation_reviews(order_id,approved_by,reason,amounts) VALUES(?,?,?,?)',[req.params.id,req.user.id,reason.trim(),JSON.stringify(amounts)]);
    await connection.commit();res.json({success:true});
  } catch(e){await connection.rollback();if(e.code)return next(e);res.status(400).json({message:e.message})}
  finally{connection.release()}
});
router.post('/checkout', orderController.checkout);
router.post('/return-exchange', requirePermission('refunds'), orderController.returnExchange);
router.post('/:id/refund', requirePermission('refunds'), orderController.refundOrder);
router.post('/:id/accept', orderController.acceptOrder);
router.post('/:id/reject', orderController.rejectOrder);
router.patch('/:id/adjust-total', restrictTo('owner'), orderController.adjustTotal);

module.exports = router;
