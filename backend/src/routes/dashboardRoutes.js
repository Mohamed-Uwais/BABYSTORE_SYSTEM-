const express = require('express');
const router = express.Router();
const dc = require('../controllers/dashboardController');

router.get('/summary', dc.summary);
router.get('/sales-chart', dc.salesChart);
router.get('/best-sellers', dc.bestSellers);
router.get('/staff-performance', dc.staffPerformance);
router.get('/customer-insights', dc.customerInsights);
router.get('/low-stock', dc.lowStock);
router.get('/payment-methods', dc.paymentMethods);
router.get('/recent-orders', dc.recentOrders);

module.exports = router;
