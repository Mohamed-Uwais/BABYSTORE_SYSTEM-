const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');

router.get('/sales', c.salesReport);
router.get('/credit', c.creditReport);
router.get('/purchases', c.purchaseReport);
router.get('/stock', c.stockReport);
router.get('/customers', c.customerReport);
router.get('/profit', c.profitReport);
router.get('/data-health', c.dataHealthCheck);
router.post('/data-health/fix-credit', c.fixCreditBalances);
router.post('/data-health/fix-points', c.fixPointsBalances);
router.post('/data-health/fix-stock', c.fixStockBalances);

module.exports = router;
