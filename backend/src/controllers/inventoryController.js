const inventoryModel = require('../models/inventoryModel');

async function adjustStock(req, res) {
  try {
    const result = await inventoryModel.adjustStock({ ...req.body, created_by: req.user?.id });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function movements(req, res) {
  try {
    const rows = await inventoryModel.getMovements(req.params.variantId, Number(req.query.limit) || 50);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock movements' });
  }
}

async function stockToggle(req, res) {
  try {
    const result = await inventoryModel.stockToggle({ ...req.body, created_by: req.user?.id });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function allVariants(req, res) {
  try {
    const rows = await inventoryModel.getAllVariantsSimple();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { adjustStock, movements, stockToggle, allVariants };
