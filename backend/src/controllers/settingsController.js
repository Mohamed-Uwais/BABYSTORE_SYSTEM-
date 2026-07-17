const settingsModel = require('../models/settingsModel');

async function getSettings(req, res) {
  try {
    const settings = await settingsModel.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
}

async function updateSettings(req, res) {
  try {
    const updated = await settingsModel.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
}

async function uploadLogo(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    const updated = await settingsModel.updateSettings({ logo_url: logoUrl });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to upload logo' });
  }
}

module.exports = { getSettings, updateSettings, uploadLogo };
