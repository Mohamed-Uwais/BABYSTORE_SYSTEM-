const quotationModel = require('../models/quotationModel');

exports.create = async (req, res) => {
  try {
    const result = await quotationModel.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await quotationModel.getAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await quotationModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    await quotationModel.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
