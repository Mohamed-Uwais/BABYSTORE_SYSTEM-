const reportModel = require('../models/reportModel');

function dateOrDefault(val, fallbackDaysAgo) {
  if (val) return val;
  const d = new Date();
  d.setDate(d.getDate() - fallbackDaysAgo);
  return d.toISOString().slice(0, 10);
}

async function salesReport(req, res) {
  try {
    const from = dateOrDefault(req.query.from, 30);
    const to = dateOrDefault(req.query.to, 0);
    const data = await reportModel.salesReport({ from, to });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function creditReport(req, res) {
  try {
    const data = await reportModel.creditReport();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function purchaseReport(req, res) {
  try {
    const from = dateOrDefault(req.query.from, 90);
    const to = dateOrDefault(req.query.to, 0);
    const data = await reportModel.purchaseReport({ from, to, supplier_id: req.query.supplier_id, status: req.query.status });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function stockReport(req, res) {
  try {
    const data = await reportModel.stockReport(req.query);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function customerReport(req, res) {
  try {
    const data = await reportModel.customerReport();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function profitReport(req, res) {
  try {
    const from = dateOrDefault(req.query.from, 30);
    const to = dateOrDefault(req.query.to, 0);
    const data = await reportModel.profitReport({ from, to });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

module.exports = { salesReport, creditReport, purchaseReport, stockReport, customerReport, profitReport };
