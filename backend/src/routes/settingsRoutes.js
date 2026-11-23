const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const contentController = require('../controllers/contentController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', settingsController.getSettings);
router.get('/label-variants', async (req, res) => {
  const db = require('../config/db');
  const [data] = await db.query(`SELECT v.id AS variant_id, v.sku, v.barcode, v.variant_label,
    v.retail_price, p.name FROM product_variants v JOIN products p ON p.id=v.product_id
    WHERE v.is_active=1 AND p.is_active=1 ORDER BY p.name, v.sku`);
  res.json({ success: true, data });
});
router.put('/', settingsController.updateSettings);
router.post('/logo', upload.single('logo'), settingsController.uploadLogo);

router.get('/content', contentController.publicGetAll);
router.put('/content/:section_key', contentController.updateSection);

module.exports = router;
