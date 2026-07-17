const publicModel = require('../models/publicModel');
const orderModel = require('../models/orderModel');
const customerModel = require('../models/customerModel');
const deliveryModel = require('../models/deliveryModel');
const db = require('../config/db');

exports.getProducts = async (req, res, next) => {
  try {
    const data = await publicModel.getProducts(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await publicModel.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.getCategories = async (req, res, next) => {
  try {
    const data = await publicModel.getCategories();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getBrands = async (req, res, next) => {
  try {
    const data = await publicModel.getBrands();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getBestSellers = async (req, res, next) => {
  try {
    const data = await publicModel.getBestSellers(Number(req.query.limit) || 8);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getNewArrivals = async (req, res, next) => {
  try {
    const data = await publicModel.getNewArrivals(Number(req.query.limit) || 8);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.checkout = async (req, res, next) => {
  try {
    let body = req.body;
    if (typeof body.items === 'string') body.items = JSON.parse(body.items);
    if (typeof body.payments === 'string') body.payments = JSON.parse(body.payments);

    const { phone, full_name, email, items, payments, fulfillment_type,
            delivery_address, delivery_zone_id, delivery, delivery_fee, notes,
            payment_method } = body;

    if (!items?.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    // Server-side tier price lookup — prevents client-side manipulation
    for (const item of items) {
      const [tiers] = await db.query(
        'SELECT * FROM variant_price_tiers WHERE variant_id = ? ORDER BY min_quantity ASC',
        [item.variantId]
      );
      if (tiers.length > 0) {
        const qty = item.qty || 1;
        let matched = null;
        for (const t of tiers) {
          if (qty >= t.min_quantity) matched = t;
        }
        if (matched) {
          item.price = Number(matched.tier_price) / matched.min_quantity;
          item.qty = qty;
        }
      }
    }

    // Total packs = sum of all item quantities (each unit is a physical pack)
    const totalPacks = items.reduce((s, i) => s + (i.qty || 1), 0);
    let calculatedDeliveryFee = 0;
    if (fulfillment_type === 'delivery') {
      const feeResult = await deliveryModel.calculateSelfDeliveryFee({ total_packs: totalPacks });
      calculatedDeliveryFee = feeResult.total_fee;
    }

    let customer_id = null;
    const [[existing]] = await db.query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (existing) {
      customer_id = existing.id;
    } else {
      const [result] = await db.query(
        'INSERT INTO customers (full_name, phone, email, customer_type) VALUES (?, ?, ?, ?)',
        [full_name || 'Website Customer', phone, email || null, 'walk_in']
      );
      customer_id = result.insertId;
    }

    const orderItems = items.map(i => ({
      variant_id: i.variantId,
      quantity: i.qty,
      unit_price: i.price,
      discount_amount: 0,
    }));

    const subtotalCalc = items.reduce((s, i) => s + i.price * i.qty, 0);

    const result = await orderModel.createOrder({
      channel: 'website',
      customer_id,
      cashier_id: null,
      items: orderItems,
      payments: payments || [{ payment_method: payment_method || 'cod', amount: subtotalCalc + calculatedDeliveryFee }],
      fulfillment_type: fulfillment_type === 'delivery' ? 'self_delivery' : 'pickup',
      delivery_address: delivery_address || null,
      delivery_zone_id: delivery_zone_id || null,
      delivery: delivery || null,
      discount_total: 0,
      delivery_fee: calculatedDeliveryFee,
      notes: notes || 'Website order',
    });

    await db.query('UPDATE orders SET status = ? WHERE order_number = ?', ['pending', result.order_number]);

    if (req.file) {
      const slipUrl = `/uploads/${req.file.filename}`;
      await db.query('UPDATE orders SET payment_slip_url = ? WHERE order_number = ?', [slipUrl, result.order_number]);
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const { order_number, phone } = req.query;
    if (!order_number) return res.status(400).json({ success: false, message: 'Order number is required' });
    const data = await publicModel.trackOrder(order_number, phone || '');
    if (!data) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getStoreInfo = async (req, res, next) => {
  try {
    const data = await publicModel.getStoreInfo();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getDeliveryZones = async (req, res, next) => {
  try {
    const data = await publicModel.getDeliveryZones();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.calculateDeliveryFee = async (req, res, next) => {
  try {
    const { total_packs } = req.query;
    const result = await deliveryModel.calculateSelfDeliveryFee({ total_packs: Number(total_packs) || 1 });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.submitContact = async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;
    if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message are required' });
    await publicModel.saveContact({ name, phone, email, message });
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) { next(err); }
};

exports.getBlogPosts = async (req, res, next) => {
  try {
    const data = await publicModel.getBlogPosts(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getBlogPost = async (req, res, next) => {
  try {
    const post = await publicModel.getBlogPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
};
