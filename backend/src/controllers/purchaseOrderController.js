const poModel = require('../models/purchaseOrderModel');

async function listPOs(req, res) {
  try {
    const pos = await poModel.getAllPOs(req.query);
    res.json({ success: true, data: pos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
  }
}

async function getPO(req, res) {
  try {
    const po = await poModel.getPOById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase order' });
  }
}

async function createPO(req, res) {
  try {
    const po = await poModel.createPO({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updatePO(req, res) {
  try {
    const po = await poModel.updatePO(req.params.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deletePO(req, res) {
  try {
    await poModel.deletePO(req.params.id);
    res.json({ success: true, message: 'Purchase order deleted' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function markPaid(req, res) {
  try {
    const po = await poModel.markPaid(req.params.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function markShipped(req, res) {
  try {
    const po = await poModel.markShipped(req.params.id);
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function markReceived(req, res) {
  try {
    const po = await poModel.markReceived(req.params.id, { created_by: req.user?.id });
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updatePaidPO(req, res) {
  try {
    const po = await poModel.updatePaidPO(req.params.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { listPOs, getPO, createPO, updatePO, deletePO, markPaid, markShipped, markReceived, updatePaidPO };
