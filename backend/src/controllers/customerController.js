const customerModel = require('../models/customerModel');

async function listCustomers(req, res) {
  try {
    const customers = await customerModel.getAllCustomers();
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
}

async function getCustomer(req, res) {
  try {
    const customer = await customerModel.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
}

async function lookupByPhone(req, res) {
  try {
    const customer = await customerModel.getCustomerByPhone(req.params.phone);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to look up customer' });
  }
}

async function addCustomer(req, res) {
  try {
    const customer = await customerModel.findOrCreateCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this phone number already exists' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
}

async function updateCustomer(req, res) {
  try {
    const customer = await customerModel.updateCustomer(req.params.id, req.body);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this phone number already exists' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
}

async function convertToLoyalty(req, res) {
  try {
    const customer = await customerModel.convertToLoyalty(req.params.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function recordRepayment(req, res) {
  try {
    const { amount, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    const customer = await customerModel.recordCreditRepayment(req.params.id, parseFloat(amount), notes, req.user?.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { listCustomers, getCustomer, lookupByPhone, addCustomer, updateCustomer, convertToLoyalty, recordRepayment };
