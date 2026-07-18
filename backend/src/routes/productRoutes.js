const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/low-stock', productController.lowStock);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', productController.addProduct);
router.post('/full', productController.addProductWithVariants);
router.put('/:id', productController.editProduct);
router.put('/variants/:variantId', productController.editVariant);
router.get('/variants/:variantId/price-tiers', productController.getPriceTiers);
router.put('/variants/:variantId/price-tiers', productController.savePriceTiers);
router.delete('/variants/:variantId', productController.deleteVariant);
router.delete('/:id', productController.deleteProduct);
router.get('/:id/has-orders', productController.checkOrderHistory);
router.post('/upload-image', upload.single('image'), productController.uploadImage);

// Product images CRUD
router.get('/:id/images', productController.getProductImages);
router.post('/:id/images', upload.single('image'), productController.addProductImage);
router.post('/:id/images/url', productController.addProductImageByUrl);
router.put('/:id/images/reorder', productController.reorderImages);
router.put('/images/:imageId/primary', productController.setImagePrimary);
router.delete('/images/:imageId', productController.deleteProductImage);

module.exports = router;
