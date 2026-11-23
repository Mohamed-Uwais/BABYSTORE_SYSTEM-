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
    if(!require('../middleware/salesScope').unrestricted(req.user) && req.body.allocations?.some(l=>Number(l.courier_fee)||Number(l.other_deduction)))return res.status(403).json({message:'Owner or administrator approval required for fees and deductions'});
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Amount is required' });
    const receipt=await model.recordSettlement({
      sourceReceiptId:req.body.source_receipt_id,businessDate:req.body.business_receipt_date,allocations:req.body.allocations,preview:req.path.endsWith('/preview'),method:req.body.method,account:req.body.account,key:req.headers['idempotency-key'],
      courierCode: req.params.courierCode,
      amount: Number(amount),
      deliveryIds: delivery_ids || [],
      notes,
      userId: req.user?.id,
    });
    res.json({ success: true, data:receipt });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.getBackfillPreview = async (req, res) => {
  try {
    const data = await model.getBackfillPreview();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
