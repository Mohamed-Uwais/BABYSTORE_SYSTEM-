const contentModel = require('../models/contentModel');

async function publicGetAll(req, res) {
  try {
    const data = await contentModel.getAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSection(req, res) {
  try {
    const { section_key } = req.params;
    const allowed = [
      'hero', 'promo_banners', 'categories', 'stats', 'brand_story',
      'testimonials', 'cta_banner', 'footer', 'announcement_bar',
    ];
    if (!allowed.includes(section_key)) {
      return res.status(400).json({ success: false, message: `Invalid section: ${section_key}` });
    }
    const content = req.body.content;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ success: false, message: 'content must be a JSON object' });
    }
    const updated = await contentModel.upsert(section_key, content);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { publicGetAll, updateSection };
