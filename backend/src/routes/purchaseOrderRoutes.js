const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');

router.use(require('./purchaseFinance'));
router.get('/low-stock', require('../controllers/productController').lowStock);
router.get('/variants', async (req,res) => {
  const [rows] = await require('../config/db').query(`SELECT v.id AS variant_id,v.sku,v.barcode,v.variant_label,p.name
    FROM product_variants v JOIN products p ON p.id=v.product_id
    WHERE p.is_active AND v.is_active ORDER BY p.name,v.id`);
  res.json({data:rows});
});
router.get('/', poController.listPOs);
router.get('/:id', poController.getPO);
router.post('/', poController.createPO);
router.put('/:id', poController.updatePO);
router.delete('/:id', poController.deletePO);
router.patch('/:id/costs', poController.updatePaidPO);
router.patch('/:id/pay', poController.markPaid);
router.patch('/:id/ship', poController.markShipped);
router.post('/:id/receipt-preview', poController.markReceived);
router.patch('/:id/receive', poController.markReceived);

module.exports = router;
