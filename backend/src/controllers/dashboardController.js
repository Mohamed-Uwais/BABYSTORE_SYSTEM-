const dashboard = require('../models/dashboardModel');

exports.summary = async (req, res) => {
  try {
    const data = await dashboard.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.salesChart = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await dashboard.getSalesChart(days);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bestSellers = async (req, res) => {
  try {
    const data = await dashboard.getBestSellers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.staffPerformance = async (req, res) => {
  try {
    const data = await dashboard.getStaffPerformance();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.customerInsights = async (req, res) => {
  try {
    const data = await dashboard.getCustomerInsights();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.lowStock = async (req, res) => {
  try {
    const data = await dashboard.getLowStock();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.paymentMethods = async (req, res) => {
  try {
    const data = await dashboard.getPaymentMethodBreakdown();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.recentOrders = async (req, res) => {
  try {
    const data = await dashboard.getRecentOrders();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
