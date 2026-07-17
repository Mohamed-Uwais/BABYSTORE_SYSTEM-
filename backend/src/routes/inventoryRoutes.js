const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/variants', inventoryController.allVariants);
router.post('/stock-toggle', inventoryController.stockToggle);
router.post('/adjust', inventoryController.adjustStock);
router.get('/movements/:variantId', inventoryController.movements);

module.exports = router;
