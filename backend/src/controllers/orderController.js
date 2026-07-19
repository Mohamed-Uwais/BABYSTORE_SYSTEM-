const orderModel = require('../models/orderModel');

async function checkout(req, res) {
  try {
    const result = await orderModel.createOrder(req.body);
    res.status(201).json({ success: true, message: 'Order completed', data: result });
  } catch (error) {
    console.error(error);
    // Business-rule errors (stock, credit eligibility, payment mismatch) are safe to show the cashier directly
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getOrder(req, res) {
  try {
    const order = await orderModel.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
}

async function listOrders(req, res) {
  try {
    const orders = await orderModel.getAllOrders(req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
}

async function bestSellers(req, res) {
  try {
    const products = await orderModel.getBestSellers();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch best sellers' });
  }
}

async function refundOrder(req, res) {
  try {
    const result = await orderModel.processRefund(
      parseInt(req.params.id), req.body, req.user.id
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getReturns(req, res) {
  try {
    const returns = await orderModel.getOrderReturns(parseInt(req.params.id));
    res.json({ success: true, data: returns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch returns' });
  }
}

async function searchForReturn(req, res) {
  try {
    const orders = await orderModel.searchOrderForReturn(req.query.q || '');
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
}

async function getReturnItems(req, res) {
  try {
    const items = await orderModel.getOrderItemsForReturn(parseInt(req.params.id));
    res.json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch return items' });
  }
}

async function returnExchange(req, res) {
  try {
    const result = await orderModel.processReturnExchange(req.body, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getPendingOrders(req, res) {
  try {
    const orders = await orderModel.getPendingOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending orders' });
  }
}

async function acceptOrder(req, res) {
  try {
    await orderModel.acceptOrder(parseInt(req.params.id), req.user?.id);
    res.json({ success: true, message: 'Order accepted' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function rejectOrder(req, res) {
  try {
    await orderModel.rejectOrder(parseInt(req.params.id), req.user?.id, req.body.reason);
    res.json({ success: true, message: 'Order rejected' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { checkout, getOrder, listOrders, bestSellers, refundOrder, getReturns, searchForReturn, getReturnItems, returnExchange, getPendingOrders, acceptOrder, rejectOrder };
