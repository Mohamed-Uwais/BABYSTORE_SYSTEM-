const catalogModel = require('../models/catalogModel');

async function listCategories(req, res) {
  try {
    res.json({ success: true, data: await catalogModel.getAllCategories() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
}

async function addCategory(req, res) {
  try {
    res.status(201).json({ success: true, data: await catalogModel.createCategory(req.body) });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listBrands(req, res) {
  try {
    res.json({ success: true, data: await catalogModel.getAllBrands() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch brands' });
  }
}

async function addBrand(req, res) {
  try {
    res.status(201).json({ success: true, data: await catalogModel.createBrand(req.body) });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { listCategories, addCategory, listBrands, addBrand };
