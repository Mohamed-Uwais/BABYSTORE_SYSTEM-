const promotionModel = require('../models/promotionModel');

function doesPromoApplyToItem(promo, item) {
  if (!promo.targets || promo.targets.length === 0) return true;
  return promo.targets.some(t => {
    if (t.target_type === 'all') return true;
    if (t.target_type === 'product' && Number(t.target_id) === Number(item.product_id)) return true;
    if (t.target_type === 'variant' && Number(t.target_id) === Number(item.variant_id)) return true;
    if (t.target_type === 'category' && Number(t.target_id) === Number(item.category_id)) return true;
    if (t.target_type === 'brand' && Number(t.target_id) === Number(item.brand_id)) return true;
    return false;
  });
}

function calcItemDiscount(promo, unitPrice) {
  if (promo.promo_type === 'percentage_discount' || (promo.promo_type === 'coupon_code' && promo.discount_type_resolved === 'percent')) {
    return Math.round(unitPrice * Number(promo.discount_value) / 100 * 100) / 100;
  }
  if (promo.promo_type === 'fixed_discount' || (promo.promo_type === 'coupon_code' && promo.discount_type_resolved === 'fixed')) {
    return Math.min(Number(promo.discount_value), unitPrice);
  }
  return 0;
}

/**
 * Applies promotions to cart items.
 *
 * @param {Array} cartItems - Array of { variant_id, product_id, category_id, brand_id, quantity, unit_price }
 * @param {string|null} couponCode - Optional coupon code
 * @returns {Object} { appliedPromotions, totalDiscount, adjustedItems, couponError }
 */
async function applyPromotions(cartItems, couponCode = null) {
  const activePromos = await promotionModel.getActivePromotions();
  const appliedPromotions = [];
  let totalDiscount = 0;
  const itemDiscounts = new Map();

  const cartTotal = cartItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const autoPromos = activePromos.filter(p => p.promo_type !== 'coupon_code');

  for (const promo of autoPromos) {
    if (promo.min_order_amount && cartTotal < Number(promo.min_order_amount)) continue;

    if (promo.promo_type === 'percentage_discount' || promo.promo_type === 'fixed_discount') {
      let promoDiscount = 0;
      for (const item of cartItems) {
        if (!doesPromoApplyToItem(promo, item)) continue;
        const perUnit = calcItemDiscount(promo, item.unit_price);
        const existing = itemDiscounts.get(item.variant_id) || 0;
        const perUnitTotal = perUnit * item.quantity;
        if (perUnitTotal > existing) {
          promoDiscount += perUnitTotal - existing;
          itemDiscounts.set(item.variant_id, perUnitTotal);
        }
      }
      if (promoDiscount > 0) {
        appliedPromotions.push({
          id: promo.id, title: promo.title, promo_type: promo.promo_type,
          discount: Math.round(promoDiscount * 100) / 100,
        });
        totalDiscount += promoDiscount;
      }
    }

    if (promo.promo_type === 'buy_x_get_y') {
      const buyQty = Number(promo.buy_quantity) || 2;
      const getQty = Number(promo.get_quantity) || 1;
      const setSize = buyQty + getQty;

      const qualifying = cartItems.filter(i => doesPromoApplyToItem(promo, i));
      const totalQualifyingQty = qualifying.reduce((s, i) => s + i.quantity, 0);

      if (totalQualifyingQty >= setSize) {
        const freeCount = Math.floor(totalQualifyingQty / setSize) * getQty;
        const sorted = [];
        for (const item of qualifying) {
          for (let i = 0; i < item.quantity; i++) {
            sorted.push({ variant_id: item.variant_id, unit_price: item.unit_price });
          }
        }
        sorted.sort((a, b) => a.unit_price - b.unit_price);

        let promoDiscount = 0;
        for (let i = 0; i < Math.min(freeCount, sorted.length); i++) {
          promoDiscount += sorted[i].unit_price;
        }

        if (promoDiscount > 0) {
          appliedPromotions.push({
            id: promo.id, title: promo.title, promo_type: promo.promo_type,
            discount: Math.round(promoDiscount * 100) / 100,
            freeCount,
            description: `Buy ${buyQty} get ${getQty} free`,
          });
          totalDiscount += promoDiscount;
        }
      }
    }

    if (promo.promo_type === 'bundle_deal' && promo.bundle_items?.length) {
      let bundleMatches = Infinity;
      for (const bi of promo.bundle_items) {
        const cartItem = cartItems.find(ci => Number(ci.variant_id) === Number(bi.variant_id));
        const available = cartItem ? cartItem.quantity : 0;
        bundleMatches = Math.min(bundleMatches, Math.floor(available / bi.quantity));
      }

      if (bundleMatches > 0 && bundleMatches !== Infinity) {
        let regularPrice = 0;
        for (const bi of promo.bundle_items) {
          const cartItem = cartItems.find(ci => Number(ci.variant_id) === Number(bi.variant_id));
          regularPrice += (cartItem?.unit_price || 0) * bi.quantity;
        }
        const bundleDiscount = (regularPrice - Number(promo.bundle_price)) * bundleMatches;

        if (bundleDiscount > 0) {
          appliedPromotions.push({
            id: promo.id, title: promo.title, promo_type: promo.promo_type,
            discount: Math.round(bundleDiscount * 100) / 100,
            bundleCount: bundleMatches,
            regularPrice, bundlePrice: Number(promo.bundle_price),
          });
          totalDiscount += bundleDiscount;
        }
      }
    }

    if (promo.promo_type === 'free_delivery') {
      if (!promo.min_order_amount || cartTotal >= Number(promo.min_order_amount)) {
        appliedPromotions.push({
          id: promo.id, title: promo.title, promo_type: 'free_delivery',
          discount: 0, freeDelivery: true,
        });
      }
    }
  }

  let couponError = null;
  if (couponCode) {
    const result = await promotionModel.validateCoupon(couponCode);
    if (!result.valid) {
      couponError = result.message;
    } else {
      const coupon = result.promotion;
      if (coupon.min_order_amount && cartTotal < Number(coupon.min_order_amount)) {
        couponError = `Minimum order of Rs. ${Number(coupon.min_order_amount).toLocaleString()} required`;
      } else {
        const isPercent = coupon.discount_value <= 100 && !coupon.bundle_price;
        coupon.discount_type_resolved = isPercent ? 'percent' : 'fixed';

        let couponDiscount = 0;
        const hasTargets = coupon.targets && coupon.targets.length > 0 &&
          !coupon.targets.every(t => t.target_type === 'all');

        if (hasTargets) {
          for (const item of cartItems) {
            if (!doesPromoApplyToItem(coupon, item)) continue;
            const perUnit = calcItemDiscount(coupon, item.unit_price);
            couponDiscount += perUnit * item.quantity;
          }
        } else {
          if (isPercent) {
            couponDiscount = Math.round(cartTotal * Number(coupon.discount_value) / 100 * 100) / 100;
          } else {
            couponDiscount = Math.min(Number(coupon.discount_value), cartTotal);
          }
        }

        if (couponDiscount > 0) {
          appliedPromotions.push({
            id: coupon.id, title: coupon.title, promo_type: 'coupon_code',
            discount: Math.round(couponDiscount * 100) / 100,
            coupon_code: coupon.coupon_code,
          });
          totalDiscount += couponDiscount;
        }
      }
    }
  }

  totalDiscount = Math.round(Math.min(totalDiscount, cartTotal) * 100) / 100;

  return {
    appliedPromotions,
    totalDiscount,
    couponError,
    freeDelivery: appliedPromotions.some(p => p.freeDelivery),
  };
}

module.exports = applyPromotions;
