const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');

router.get('/', poController.listPOs);
router.get('/:id', poController.getPO);
router.post('/', poController.createPO);
router.put('/:id', poController.updatePO);
router.delete('/:id', poController.deletePO);
router.patch('/:id/costs', poController.updatePaidPO);
router.patch('/:id/pay', poController.markPaid);
router.patch('/:id/ship', poController.markShipped);
router.patch('/:id/receive', poController.markReceived);

module.exports = router;
