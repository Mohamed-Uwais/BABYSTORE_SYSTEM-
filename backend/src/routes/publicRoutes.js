const express = require('express');
const router = express.Router();
const pc = require('../controllers/publicController');
const promoCtrl = require('../controllers/promotionController');
const contentCtrl = require('../controllers/contentController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/products', pc.getProducts);
router.get('/products/:slug', pc.getProduct);
router.get('/categories', pc.getCategories);
router.get('/brands', pc.getBrands);
router.get('/best-sellers', pc.getBestSellers);
router.get('/new-arrivals', pc.getNewArrivals);
router.post('/checkout', upload.single('payment_slip'), pc.checkout);
router.get('/track', pc.trackOrder);
router.get('/store-info', pc.getStoreInfo);
router.get('/delivery/zones', pc.getDeliveryZones);
router.get('/delivery/calculate-fee', pc.calculateDeliveryFee);
router.post('/contact', pc.submitContact);
router.get('/blog', pc.getBlogPosts);
router.get('/blog/:slug', pc.getBlogPost);

router.get('/promotions/active', promoCtrl.publicGetActive);
router.get('/promotions/banner', promoCtrl.publicGetBanner);
router.post('/promotions/validate', promoCtrl.publicValidateCoupon);
router.post('/promotions/calculate', promoCtrl.calculateCart);

router.get('/content', contentCtrl.publicGetAll);

module.exports = router;
