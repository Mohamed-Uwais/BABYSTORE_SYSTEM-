const model = require('../models/settlementModel');

exports.getSummaries = async (req, res) => {
  try {
    const data = await model.getCourierSummaries();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getUnsettledOrders = async (req, res) => {
  try {
    const data = await model.getUnsettledOrders(req.params.courierCode);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.recordSettlement = async (req, res) => {
  try {
    const { amount, delivery_ids, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Amount is required' });
    await model.recordSettlement({
      courierCode: req.params.courierCode,
      amount: Number(amount),
      deliveryIds: delivery_ids || [],
      notes,
      userId: req.user?.id,
    });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.getBackfillPreview = async (req, res) => {
  try {
    const data = await model.getBackfillPreview();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
