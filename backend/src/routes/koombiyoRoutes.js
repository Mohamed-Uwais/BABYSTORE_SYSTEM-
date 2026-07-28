const express = require('express');
const router = express.Router();
const koombiyoController = require('../controllers/koombiyoController');

router.post('/create-waybill', koombiyoController.createWaybill);
router.get('/track/:waybill_no', koombiyoController.trackOrder);
router.post('/cancel/:waybill_no', koombiyoController.cancelShipment);
router.get('/label/:waybill_no', koombiyoController.getLabel);
router.get('/track-order/:order_id', koombiyoController.trackOnDemand);

module.exports = router;
