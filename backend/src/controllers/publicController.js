const publicModel = require('../models/publicModel');
const orderModel = require('../models/orderModel');
const applyPromotions = require('../utils/applyPromotions');
const { requestHash, completedRequest } = require('../utils/checkoutRequest');
const deliveryModel = require('../models/deliveryModel');
const db = require('../config/db');
const phoneTools = require('../utils/mobilePhone');

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

exports.quoteCart=async(req,res,next)=>{
  try{res.json({success:true,data:await require('../services/cartQuote')(req.body||{},{db,deliveryModel,applyPromotions})});}
  catch(error){next(error);}
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

    const { normalizeMobilePhone, MOBILE_PHONE_HELP } = await phoneTools;
    const normalizedPhone = normalizeMobilePhone(phone);
    if (!normalizedPhone) return res.status(400).json({ success: false, message: MOBILE_PHONE_HELP });
    if (payments && (!Array.isArray(payments) || payments.some(p => !p || !['cod', 'bank_transfer'].includes(p.payment_method)))) {
      return res.status(400).json({ success: false, message: 'Invalid website payment method' });
    }
    if (payment_method && !['cod', 'bank_transfer'].includes(payment_method)) return res.status(400).json({ success: false, message: 'Invalid website payment method' });
    const quote=await require('../services/cartQuote')(body,{db,deliveryModel,applyPromotions});
    if((body.quote_signature!==undefined&&body.quote_signature!==quote.signature)||(body.expected_total!==undefined && (!Number.isFinite(Number(body.expected_total))||Math.abs(Number(body.expected_total)-quote.grand_total)>0.005))){
      return res.status(409).json({success:false,message:'Prices, discounts or delivery charges changed. Review the updated order before confirming.',data:{quote}});
    }
    // Unique phone handling is atomic; simultaneous first orders share a customer.
    const [customerResult] = await db.query(
      `INSERT INTO customers (full_name, phone, email, customer_type) VALUES (?, ?, ?, 'walk_in')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [full_name || 'Website Customer', normalizedPhone, email || null]
    );
    const customer_id = customerResult.insertId;

    const orderItems = quote.items.map(i => ({
      variant_id: i.variantId,
      quantity: i.qty,
      unit_price: i.price,
      discount_amount: 0,
    }));


    const result = await orderModel.createOrder({
      channel: 'website',
      customer_id,
      cashier_id: null,
      items: orderItems,
      payments: [{ payment_method: payment_method || payments?.[0]?.payment_method || 'cod', amount: quote.grand_total }],
      fulfillment_type: fulfillment_type === 'delivery' ? 'self_delivery' : 'pickup',
      delivery_address: delivery_address || null,
      delivery_zone_id: delivery_zone_id || null,
      delivery: fulfillment_type === 'delivery' ? { receiver_name: full_name || null, receiver_phone: normalizedPhone, receiver_address: delivery_address || null } : null,
      discount_total: quote.discount_total,
      delivery_fee: quote.delivery_fee,
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
    if(!(await phoneTools).normalizeMobilePhone(phone))return res.status(400).json({success:false,message:'Enter the mobile number used for this order.'});
    const data = await publicModel.trackOrder(order_number, phone || '');
    if (!data) return res.status(404).json({ success: false, message: 'Order not found' });
    const {id,...publicOrder}=data;
    res.json({ success: true, data: publicOrder });
  } catch (err) { next(err); }
};

exports.repeatOrder=async(req,res,next)=>{
  try{
    const {order_number,phone}=req.body||{};
    const order=await publicModel.trackOrder(order_number,phone);
    if(!order)return res.status(404).json({success:false,message:'Order and mobile number do not match.'});
    const items=[],unavailable=[];
    for(const previous of order.items){
      const product=await publicModel.getProductBySlug(previous.slug);
      const variant=product?.variants.find(row=>row.id===previous.variant_id&&row.in_stock);
      if(!variant){unavailable.push(previous.product_name);continue;}
      const qty=Math.min(Number(previous.quantity),Number(variant.current_stock));
      const quote=await require('../services/cartQuote')({items:[{variantId:variant.id,qty}],fulfillment_type:'pickup'},{db,deliveryModel,applyPromotions});
      items.push({product:{id:product.id,name:product.name,slug:product.slug,brand_name:product.brand_name,image_url:product.images?.[0]?.image_url},variant:{...variant,label:variant.variant_label,discounted_price:quote.items[0].price},qty,reduced:qty<Number(previous.quantity)});
    }
    res.json({success:true,data:{items,unavailable}});
  }catch(error){next(error);}
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
    const { normalizeMobilePhone, MOBILE_PHONE_HELP } = await phoneTools;
    const normalizedPhone = phone ? normalizeMobilePhone(phone) : null;
    if (phone && !normalizedPhone) return res.status(400).json({ success: false, message: MOBILE_PHONE_HELP });
    await publicModel.saveContact({ name, phone: normalizedPhone, email, message });
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) { next(err); }
};

exports.getBlogPosts = async (req, res, next) => {
  try {
    const data = await publicModel.getBlogPosts(req.query,await require('../services/publicContent')(req.query.preview));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getBlogPost = async (req, res, next) => {
  try {
    const post = await publicModel.getBlogPostBySlug(req.params.slug,await require('../services/publicContent')(req.query.preview));
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
};
