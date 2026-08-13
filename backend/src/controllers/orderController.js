const orderModel = require('../models/orderModel');
const db = require('../config/db');
const notifier = require('../utils/orderNotifier');

async function checkout(req, res) {
  try {
    // Log incoming request for debugging
    console.log('[CHECKOUT] Received payload:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields before processing
    const { channel, items, payments, customer_id, cashier_id } = req.body;
    
    if (!channel) {
      return res.status(400).json({ success: false, message: 'Missing required field: channel' });
    }
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Missing required field: items (must be array)' });
    }
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }
    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ success: false, message: 'Missing required field: payments (must be array)' });
    }
    if (payments.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one payment method is required' });
    }
    
    // Validate items structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.variant_id) return res.status(400).json({ success: false, message: `Item ${i}: missing variant_id` });
      if (!item.quantity || item.quantity <= 0) return res.status(400).json({ success: false, message: `Item ${i}: invalid quantity` });
      if (!item.unit_price || item.unit_price < 0) return res.status(400).json({ success: false, message: `Item ${i}: invalid unit_price` });
    }
    
    // Validate payments structure
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      if (!payment.payment_method) return res.status(400).json({ success: false, message: `Payment ${i}: missing payment_method` });
      if (!payment.amount || payment.amount <= 0) return res.status(400).json({ success: false, message: `Payment ${i}: invalid amount` });
    }
    
    const result = await orderModel.createOrder(req.body);
    console.log('[CHECKOUT] Order created successfully:', result.orderId);
    res.status(201).json({ success: true, message: 'Order completed', data: result });
  } catch (error) {
    console.error('[CHECKOUT] Error:', error.message, error.stack);
    // Business-rule errors (stock, credit eligibility, payment mismatch) are safe to show the cashier directly
    res.status(400).json({ success: false, message: error.message, error: process.env.NODE_ENV === 'development' ? error.stack : undefined });
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
    notifier.notifyConfirmed(parseInt(req.params.id));
    res.json({ success: true, message: 'Order accepted' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function rejectOrder(req, res) {
  try {
    await orderModel.rejectOrder(parseInt(req.params.id), req.user?.id, req.body.reason);
    notifier.notifyRejected(parseInt(req.params.id), req.body.reason);
    res.json({ success: true, message: 'Order rejected' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adjustTotal(req, res) {
  try {
    const { id } = req.params;
    const { grand_total, reason } = req.body;
    if (grand_total == null || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'New total and reason are required' });
    }
    const [[order]] = await db.query('SELECT id, grand_total FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const oldTotal = Number(order.grand_total);
    const newTotal = Number(grand_total);
    await db.query('UPDATE orders SET grand_total = ? WHERE id = ?', [newTotal, id]);
    await db.query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES (?, ?, ?, ?)',
      [id, 'amount_adjusted', req.user.id, `Total changed from Rs.${oldTotal.toFixed(2)} to Rs.${newTotal.toFixed(2)}. Reason: ${reason.trim()}`]
    );
    res.json({ success: true, message: 'Order total updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { checkout, getOrder, listOrders, bestSellers, refundOrder, getReturns, searchForReturn, getReturnItems, returnExchange, getPendingOrders, acceptOrder, rejectOrder, adjustTotal };
