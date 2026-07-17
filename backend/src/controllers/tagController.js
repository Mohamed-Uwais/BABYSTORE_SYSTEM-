const tagModel = require('../models/tagModel');

async function getAllTags(req, res) {
  try {
    const tags = await tagModel.getAllTags();
    res.json({ success: true, data: tags });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createTag(req, res) {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ success: false, message: 'Tag name required' });
    const tag = await tagModel.createTag(req.body);
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Tag already exists' });
    res.status(400).json({ success: false, message: err.message });
  }
}

async function deleteTag(req, res) {
  try {
    await tagModel.deleteTag(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function setProductTags(req, res) {
  try {
    await tagModel.setProductTags(req.params.productId, req.body.tag_ids || []);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

module.exports = { getAllTags, createTag, deleteTag, setProductTags };
