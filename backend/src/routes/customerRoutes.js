const express = require('express');
const router = express.Router();
const cc = require('../controllers/customerController');

router.get('/', cc.listCustomers);
router.get('/search', cc.searchCustomers);
router.get('/phone/:phone', cc.lookupByPhone);
router.get('/:id', cc.getCustomer);
router.post('/', cc.addCustomer);
router.put('/:id', cc.updateCustomer);
router.patch('/:id/convert-loyalty', cc.convertToLoyalty);
router.post('/:id/repayment', cc.recordRepayment);

module.exports = router;
