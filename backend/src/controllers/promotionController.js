const promotionModel = require('../models/promotionModel');
const applyPromotions = require('../utils/applyPromotions');
const db = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const data = await promotionModel.list(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await promotionModel.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Promotion not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user?.id };
    const result = await promotionModel.create(data);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const result = await promotionModel.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await promotionModel.remove(req.params.id);
    res.json({ success: true, message: 'Promotion deactivated' });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const data = await promotionModel.getStats(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Promotion not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.publicGetActive = async (req, res, next) => {
  try {
    const promos = await promotionModel.getActivePromotions();
    const safePromos = promos.map(p => ({
      id: p.id, title: p.title, description: p.description,
      promo_type: p.promo_type, discount_value: p.discount_value,
      buy_quantity: p.buy_quantity, get_quantity: p.get_quantity,
      bundle_price: p.bundle_price, min_order_amount: p.min_order_amount,
      banner_text: p.banner_text, banner_color: p.banner_color,
      starts_at: p.starts_at, ends_at: p.ends_at,
      targets: p.targets, bundle_items: p.bundle_items,
    }));
    res.json({ success: true, data: safePromos });
  } catch (err) { next(err); }
};

exports.publicGetBanner = async (req, res, next) => {
  try {
    const data = await promotionModel.getHomepageBanners();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.publicValidateCoupon = async (req, res, next) => {
  try {
    const { code, items } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });

    let cartItems = items || [];
    if (cartItems.length) {
      const variantIds = cartItems.map(i => i.variantId || i.variant_id);
      const [variants] = await db.query(
        `SELECT pv.id AS variant_id, pv.retail_price, pv.product_id,
           p.category_id, p.brand_id
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id IN (?)`,
        [variantIds]
      );
      cartItems = cartItems.map(ci => {
        const v = variants.find(v => Number(v.variant_id) === Number(ci.variantId || ci.variant_id));
        return {
          variant_id: ci.variantId || ci.variant_id,
          product_id: v?.product_id,
          category_id: v?.category_id,
          brand_id: v?.brand_id,
          quantity: ci.qty || ci.quantity || 1,
          unit_price: ci.price || ci.unit_price || Number(v?.retail_price || 0),
        };
      });
    }

    const result = await applyPromotions(cartItems, code);
    if (result.couponError) {
      return res.json({ success: false, message: result.couponError });
    }

    const couponPromo = result.appliedPromotions.find(p => p.promo_type === 'coupon_code');
    res.json({
      success: true,
      data: {
        code,
        discount: couponPromo?.discount || 0,
        title: couponPromo?.title || '',
        appliedPromotions: result.appliedPromotions,
        totalDiscount: result.totalDiscount,
        freeDelivery: result.freeDelivery,
      },
    });
  } catch (err) { next(err); }
};

exports.calculateCart = async (req, res, next) => {
  try {
    const { items, couponCode } = req.body;
    if (!items?.length) return res.json({ success: true, data: { appliedPromotions: [], totalDiscount: 0 } });

    const variantIds = items.map(i => i.variantId || i.variant_id);
    const [variants] = await db.query(
      `SELECT pv.id AS variant_id, pv.retail_price, pv.product_id,
         p.category_id, p.brand_id
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id IN (?)`,
      [variantIds]
    );

    const cartItems = items.map(ci => {
      const v = variants.find(v => Number(v.variant_id) === Number(ci.variantId || ci.variant_id));
      return {
        variant_id: ci.variantId || ci.variant_id,
        product_id: v?.product_id,
        category_id: v?.category_id,
        brand_id: v?.brand_id,
        quantity: ci.qty || ci.quantity || 1,
        unit_price: ci.price || ci.unit_price || Number(v?.retail_price || 0),
      };
    });

    const result = await applyPromotions(cartItems, couponCode || null);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
