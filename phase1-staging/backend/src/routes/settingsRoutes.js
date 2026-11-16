const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const contentController = require('../controllers/contentController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/logo', upload.single('logo'), settingsController.uploadLogo);

router.get('/content', contentController.publicGetAll);
router.put('/content/:section_key', (req, res, next) => {
  if (process.env.WEBSITE_STUDIO_ENABLED === 'true') {
    return res.status(409).json({ success: false, message: 'Website Studio is enabled. Save content as a draft and publish through Website Studio.' });
  }
  return contentController.updateSection(req, res, next);
});

module.exports = router;
