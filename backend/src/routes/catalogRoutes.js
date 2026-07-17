const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

router.get('/categories', catalogController.listCategories);
router.get('/brands', catalogController.listBrands);
router.post('/categories', catalogController.addCategory);
router.post('/brands', catalogController.addBrand);

module.exports = router;
