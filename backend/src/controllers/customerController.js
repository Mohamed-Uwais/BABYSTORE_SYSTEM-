const customerModel = require('../models/customerModel');

async function listCustomers(req, res) {
  try {
    const customers = await customerModel.getAllCustomers();
    if(!require('../middleware/salesScope').unrestricted(req.user)){
      for(const customer of customers){delete customer.total_spent;delete customer.total_orders}
    }
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
    if(!require('../middleware/salesScope').unrestricted(req.user)){
      delete customer.total_spent;delete customer.total_orders;
      const visible=await require('../utils/salesAccess').cashierBills(require('../config/db'));
      const allowed=new Set(visible.map(o=>o.id));
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      customer.orders=customer.orders.filter(o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(o.created_at))<today||allowed.has(o.id));
    }
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
    const customer = await customerModel.recordCreditRepayment(req.params.id, parseFloat(amount), notes, req.user?.id,{...req.body,key:req.headers['idempotency-key']});
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function searchCustomers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 3) return res.json({ success: true, data: [] });
    const like = `%${q}%`;
    const db = require('../config/db');
    const [rows] = await db.query(
      `SELECT id, full_name, phone, loyalty_tier, customer_type, credit_balance
       FROM customers
       WHERE phone LIKE ? OR full_name LIKE ?
       ORDER BY full_name ASC LIMIT 10`,
      [like, like]
    );
    res.json({ success: true, data: rows.map(r => ({ ...r, credit_balance: Number(r.credit_balance) })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
}

module.exports = { listCustomers, getCustomer, lookupByPhone, addCustomer, updateCustomer, convertToLoyalty, recordRepayment, searchCustomers };
