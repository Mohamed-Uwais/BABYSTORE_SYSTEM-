const express = require('express');
const router = express.Router();
const pc = require('../controllers/publicController');
const promoCtrl = require('../controllers/promotionController');
const contentCtrl = require('../controllers/contentController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/products', pc.getProducts);
router.get('/products/:slug', pc.getProduct);
router.get('/categories', pc.getCategories);

// Featured product images for banners (one image per category)
router.get('/banner-images', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.query(`
      SELECT c.name AS category_name, pv.image_url
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE pv.is_active = 1 AND p.is_active = 1 AND pv.image_url IS NOT NULL AND pv.image_url != ''
      ORDER BY pv.current_stock DESC
      LIMIT 20
    `);
    res.json({ success: true, data: rows.map(r => r.image_url) });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});
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

// ── Public live tracking (Koombiyo API poll) ──
router.get('/track-live/:order_number', async (req, res) => {
  try {
    const db = require('../config/db');
    const { order_number } = req.params;
    const [[order]] = await db.query('SELECT id FROM orders WHERE order_number = ?', [order_number]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const [[delivery]] = await db.query(
      `SELECT od.tracking_number, od.delivery_status, c.code AS courier_code, c.tracking_url_template
       FROM order_deliveries od LEFT JOIN couriers c ON c.id = od.courier_id WHERE od.order_id = ?`, [order.id]
    );
    if (!delivery || !delivery.tracking_number) {
      return res.json({ success: true, data: { status: 'processing', message: 'No tracking info yet' } });
    }

    if (delivery.courier_code === 'koombiyo') {
      const koombiyo = require('../services/koombiyoService');
      try {
        const result = await koombiyo.trackOrder(delivery.tracking_number);
        return res.json({ success: true, data: { ...result, courier: 'Koombiyo', tracking_number: delivery.tracking_number } });
      } catch {
        return res.json({ success: true, data: { status: delivery.delivery_status || 'unknown', courier: 'Koombiyo', tracking_number: delivery.tracking_number } });
      }
    }

    const fardar = require('../couriers/fardar');
    return res.json({ success: true, data: {
      status: delivery.delivery_status || 'unknown',
      courier: 'Fardar Express',
      tracking_number: delivery.tracking_number,
      tracking_url: fardar.getTrackingUrl(delivery.tracking_number, delivery.tracking_url_template),
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Tracking unavailable' });
  }
});

// ── Website live chat with Liya ──
const axios = require('axios');
const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:5002';

router.post('/chat', async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });

    const resp = await axios.post(`${CHATBOT_URL}/api/simulate`, {
      message: message.trim(),
      phone: session_id || `web_${Date.now()}`,
    }, { timeout: 30000 });

    res.json({
      reply: resp.data.reply,
      images: resp.data.images || [],
      session_id: session_id || resp.data.conversationId,
    });
  } catch (err) {
    res.status(502).json({ error: 'Chat service unavailable' });
  }
});

module.exports = router;
