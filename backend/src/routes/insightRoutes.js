const express = require('express');
const router = express.Router();
const c = require('../controllers/insightController');

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
