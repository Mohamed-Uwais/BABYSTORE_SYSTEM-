const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');
const ownerOnly=require('../middleware/authMiddleware').restrictTo('owner');

router.get('/sales', c.salesReport);
router.get('/collections',ownerOnly,async(req,res,next)=>{try{res.json({data:await require('../models/collectionModel').report(req.query)});}catch(error){next(error);}});
router.get('/credit', c.creditReport);
router.get('/purchases', ownerOnly, c.purchaseReport);
router.get('/stock', ownerOnly, c.stockReport);
router.get('/customers', ownerOnly, c.customerReport);
router.get('/profit', ownerOnly, c.profitReport);
router.get('/data-health', ownerOnly, c.dataHealthCheck);
router.post('/data-health/fix-credit', ownerOnly, c.fixCreditBalances);
router.post('/data-health/fix-points', ownerOnly, c.fixPointsBalances);
router.post('/data-health/fix-stock', ownerOnly, c.fixStockBalances);

module.exports = router;
