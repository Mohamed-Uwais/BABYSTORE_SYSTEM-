const express = require('express');
const router = express.Router();
const c = require('../controllers/settlementController');

router.get('/summaries', c.getSummaries);
router.get('/backfill-preview', c.getBackfillPreview);
router.get('/:courierCode/orders', c.getUnsettledOrders);
router.post('/:courierCode/settle', c.recordSettlement);

module.exports = router;
