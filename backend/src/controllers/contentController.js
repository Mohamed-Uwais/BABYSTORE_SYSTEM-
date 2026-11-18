const contentModel = require('../models/contentModel');

async function publicGetAll(req, res) {
  try {
    if(req.query.preview){res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');}
    const data=await require('../services/publicContent')(req.query.preview);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status||500).json({ success: false, message: err.message });
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
    const clean = require('../services/websiteStudio').validateSection(section_key,content);
    const updated = await contentModel.upsert(section_key, clean);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

module.exports = { publicGetAll, updateSection };
