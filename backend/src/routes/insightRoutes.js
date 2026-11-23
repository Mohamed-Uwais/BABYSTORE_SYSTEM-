const express = require('express');
const router = express.Router();
const c = require('../controllers/insightController');

router.use(async(req,res,next)=>{try{
 if(require('../middleware/salesScope').unrestricted(req.user))return next();
 if(req.path==='/export/orders'){
   const rows=await require('../utils/salesAccess').cashierBills(require('../config/db'));
   return res.json({success:true,data:require('../middleware/salesScope').visibleBills(rows,req.query)});
 }
 if(['/daily-summary','/dead-stock','/reorder-predictions','/low-stock-reorder'].includes(req.path)||req.path.startsWith('/export/'))return res.status(403).json({message:'Owner or administrator access required'});
 next();
 }catch(error){next(error)}
});
router.get('/reorder-predictions', c.reorderPredictions);
router.get('/dead-stock', c.deadStock);
router.get('/low-stock-reorder', c.lowStockWithSupplier);
router.get('/daily-summary', c.dailySummary);
router.get('/packing-queue', c.getPackingQueue);
router.get('/orders/:id/timeline', c.getOrderTimeline);
router.put('/orders/:id/status', c.updateOrderStatus);
router.get('/export/products', c.exportProducts);
router.get('/export/customers', c.exportCustomers);
router.get('/export/orders', c.exportOrders);
router.post('/import/products', c.importProducts);

module.exports = router;
