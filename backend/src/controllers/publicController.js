const publicModel = require('../models/publicModel');
const orderModel = require('../models/orderModel');
const applyPromotions = require('../utils/applyPromotions');
const { requestHash, completedRequest } = require('../utils/checkoutRequest');
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
    const body = { ...(req.body || {}) };
    const submissionHash = requestHash(body);
    const submissionKey = req.headers['idempotency-key'] ? `web:${req.headers['idempotency-key']}` : null;
    // Replay before recalculating stock/promotions, which may have changed since commit.
    const replay = await completedRequest(db, submissionKey, submissionHash);
    if (replay) {
      if (req.file) await require('node:fs/promises').unlink(req.file.path).catch(() => {});
      return res.json({ success: true, data: replay });
    }
    if (typeof body.items === 'string') body.items = JSON.parse(body.items);
    if (typeof body.payments === 'string') body.payments = JSON.parse(body.payments);

    const { phone, full_name, email, items, payments, fulfillment_type,
            delivery_address, delivery_zone_id, notes,
            payment_method } = body;

    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    if (typeof phone !== 'string' || !phone.trim()) return res.status(400).json({ success: false, message: 'Phone number is required' });
    if (payments && (!Array.isArray(payments) || payments.some(p => !p || !['cod', 'bank_transfer'].includes(p.payment_method)))) {
      return res.status(400).json({ success: false, message: 'Invalid website payment method' });
    }
    if (payment_method && !['cod', 'bank_transfer'].includes(payment_method)) return res.status(400).json({ success: false, message: 'Invalid website payment method' });
    // Server-side tier price lookup — prevents client-side manipulation
    for (const item of items) {
      if (!item || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isSafeInteger(Number(item.variantId))) {
        return res.status(400).json({ success: false, message: 'Invalid cart item or quantity' });
      }
      item.qty = Number(item.qty);
      const [[variant]] = await db.query(
        `SELECT pv.retail_price, pv.discount_type, pv.discount_value, pv.product_id, p.category_id, p.brand_id
         FROM product_variants pv JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ? AND pv.is_active = TRUE AND p.is_active = TRUE AND p.show_on_website = TRUE`, [item.variantId]
      );
      if (!variant) return res.status(400).json({ success: false, message: 'A cart product is no longer available' });
      item.price = Number(variant.retail_price);
      if (variant.discount_type === 'percent') item.price *= 1 - Number(variant.discount_value) / 100;
      if (variant.discount_type === 'amount') item.price = Math.max(0, item.price - Number(variant.discount_value));
      item.price = Math.round(item.price * 100) / 100;
      Object.assign(item, { product_id: variant.product_id, category_id: variant.category_id, brand_id: variant.brand_id });
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
      let feeResult;
      if (delivery_zone_id) {
        feeResult = await deliveryModel.calculateFee({ zone_id: Number(delivery_zone_id), total_weight_grams: 0, total_packs: totalPacks });
      } else {
        feeResult = await deliveryModel.calculateSelfDeliveryFee({ total_packs: totalPacks });
      }
      calculatedDeliveryFee = feeResult.total_fee;
    }

    const promotion = await applyPromotions(items.map(i => ({ ...i, variant_id: i.variantId, quantity: i.qty, unit_price: i.price })), body.coupon_code || null);
    if (promotion.couponError) return res.status(400).json({ success: false, message: promotion.couponError });
    if (promotion.freeDelivery) calculatedDeliveryFee = 0;
    // Unique phone handling is atomic; simultaneous first orders share a customer.
    const [customerResult] = await db.query(
      `INSERT INTO customers (full_name, phone, email, customer_type) VALUES (?, ?, ?, 'walk_in')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [full_name || 'Website Customer', phone.trim(), email || null]
    );
    const customer_id = customerResult.insertId;

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
      payments: payments || [{ payment_method: payment_method || 'cod', amount: subtotalCalc - promotion.totalDiscount + calculatedDeliveryFee }],
      fulfillment_type: fulfillment_type === 'delivery' ? 'self_delivery' : 'pickup',
      delivery_address: delivery_address || null,
      delivery_zone_id: delivery_zone_id || null,
      delivery: fulfillment_type === 'delivery' ? { receiver_name: full_name || null, receiver_phone: phone, receiver_address: delivery_address || null } : null,
      promotion_result:promotion,
      discount_total: promotion.totalDiscount,
      delivery_fee: calculatedDeliveryFee,
      notes: notes || 'Website order',
      payment_slip_url: req.file ? `/uploads/${req.file.filename}` : null,
      request_key: submissionKey,
      request_hash: submissionHash,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof SyntaxError) err.status = 400;
    next(err);
  }
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
    const { total_packs, zone_id } = req.query;
    const packs = Number(total_packs) || 1;
    let result;
    if (zone_id) {
      result = await deliveryModel.calculateFee({ zone_id: Number(zone_id), total_weight_grams: 0, total_packs: packs });
    } else {
      result = await deliveryModel.calculateSelfDeliveryFee({ total_packs: packs });
    }
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
