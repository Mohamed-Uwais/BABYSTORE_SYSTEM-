const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { upload } = require('../middleware/uploadMiddleware');
router.use(require('../utils/financialVisibility').hideCosts);
router.use((req,res,next)=>req.method==='GET' ? next() : require('../middleware/authMiddleware').requirePermission('inventory')(req,res,next));

router.get('/billing-variants', async (req, res) => {
  const db = require('../config/db');
  const [rows] = await db.query(`SELECT v.id AS variant_id, v.sku, v.barcode, v.variant_label, v.mrp,
    v.retail_price, v.wholesale_price, v.current_stock, p.name, t.min_quantity, t.tier_price, t.label
    FROM product_variants v JOIN products p ON p.id=v.product_id
    LEFT JOIN variant_price_tiers t ON t.variant_id=v.id
    WHERE p.is_active AND v.is_active ORDER BY p.name,v.id,t.min_quantity`);
  const variants = new Map();
  for (const {min_quantity,tier_price,label,...variant} of rows) {
    if (!variants.has(variant.variant_id)) variants.set(variant.variant_id,{...variant,price_tiers:[]});
    if (min_quantity) variants.get(variant.variant_id).price_tiers.push({min_quantity,tier_price,label});
  }
  res.json({success:true,data:[...variants.values()]});
});
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
router.patch('/:id/website-visibility', productController.toggleWebsiteVisibility);
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
