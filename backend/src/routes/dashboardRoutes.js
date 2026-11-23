const express = require('express');
const router = express.Router();
const dc = require('../controllers/dashboardController');
router.use(require('../utils/financialVisibility').hideCosts);

router.use(async(req,res,next)=>{try{
 if(require('../middleware/salesScope').unrestricted(req.user)||req.path==='/low-stock')return next();
 const bills=await require('../utils/salesAccess').cashierBills(require('../config/db'));
 const revenue=bills.reduce((sum,b)=>sum+Number(b.grand_total),0);
 let data=[];
 if(req.path==='/summary')data={restricted:true,today:{orders:bills.length,revenue}};
 if(req.path==='/recent-orders')data=require('../middleware/salesScope').visibleBills(bills,req.query);
 if(req.path==='/sales-chart')data=[{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo'}).format(new Date()),revenue,orders:bills.length}];
 res.json({success:true,data,restricted:true});
 }catch(error){next(error)}
});
router.get('/summary', dc.summary);
router.get('/sales-chart', dc.salesChart);
router.get('/best-sellers', dc.bestSellers);
router.get('/staff-performance', dc.staffPerformance);
router.get('/customer-insights', dc.customerInsights);
router.get('/low-stock', dc.lowStock);
router.get('/payment-methods', dc.paymentMethods);
router.get('/recent-orders', dc.recentOrders);

module.exports = router;
