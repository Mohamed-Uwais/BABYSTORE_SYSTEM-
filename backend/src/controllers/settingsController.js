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
  const limits = { label_width: [25, 200], label_height: [15, 150], label_gap: [0, 20], label_margin: [0, 25], label_columns: [1, 8], label_name: [0, 1], label_price: [0, 1], receipt_customer: [0, 1], receipt_cashier: [0, 1], receipt_contact: [0, 1], receipt_width_mm: [32, 210], receipt_margin_mm: [0, 10], receipt_font_px: [9, 20], receipt_show_logo: [0, 1] };
  for (const [field, [min, max]] of Object.entries(limits)) {
    const value = req.body[field];
    if (value === undefined || (field === 'receipt_width_mm' && value === null)) continue;
    if (!Number.isInteger(value) || value < min || value > max) {
      return res.status(400).json({ success: false, message: `Invalid ${field}` });
    }
  }
  if (req.body.receipt_paper !== undefined && !['58mm', '80mm', 'A4'].includes(req.body.receipt_paper)) {
    return res.status(400).json({ success: false, message: 'Choose a supported receipt paper size' });
  }
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
