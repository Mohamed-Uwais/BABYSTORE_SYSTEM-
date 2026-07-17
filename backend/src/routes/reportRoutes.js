const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');

router.get('/sales', c.salesReport);
router.get('/credit', c.creditReport);
router.get('/purchases', c.purchaseReport);
router.get('/stock', c.stockReport);
router.get('/customers', c.customerReport);
router.get('/profit', c.profitReport);

module.exports = router;
