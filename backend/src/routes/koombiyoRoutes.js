const express = require('express');
const router = express.Router();
const koombiyoController = require('../controllers/koombiyoController');

router.post('/create-waybill', koombiyoController.createWaybill);
router.get('/track/:waybill_no', koombiyoController.trackOrder);
router.post('/cancel/:waybill_no', koombiyoController.cancelShipment);
router.get('/label/:waybill_no', koombiyoController.getLabel);

module.exports = router;
