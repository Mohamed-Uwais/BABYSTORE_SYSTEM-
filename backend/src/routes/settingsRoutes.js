const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const contentController = require('../controllers/contentController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/logo', upload.single('logo'), settingsController.uploadLogo);

router.get('/content', contentController.publicGetAll);
router.put('/content/:section_key', contentController.updateSection);

module.exports = router;
