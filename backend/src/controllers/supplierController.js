const supplierModel = require('../models/supplierModel');

async function listSuppliers(req, res) {
  try {
    const suppliers = await supplierModel.getAllSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
}

async function getSupplier(req, res) {
  try {
    const supplier = await supplierModel.getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch supplier' });
  }
}

async function addSupplier(req, res) {
  try {
    const supplier = await supplierModel.createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
}

async function editSupplier(req, res) {
  try {
    const supplier = await supplierModel.updateSupplier(req.params.id, req.body);
    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
}

async function removeSupplier(req, res) {
  try {
    await supplierModel.deactivateSupplier(req.params.id);
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to deactivate supplier' });
  }
}

module.exports = { listSuppliers, getSupplier, addSupplier, editSupplier, removeSupplier };
