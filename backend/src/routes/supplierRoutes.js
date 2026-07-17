const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', supplierController.addSupplier);
router.put('/:id', supplierController.editSupplier);
router.delete('/:id', supplierController.removeSupplier);

module.exports = router;
