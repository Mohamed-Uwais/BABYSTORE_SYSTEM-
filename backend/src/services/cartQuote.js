// Shared server pricing for review and checkout. Quotes do not reserve stock.
const badRequest=message=>Object.assign(new Error(message),{status:400});
module.exports=async function quoteCart(body,{db,deliveryModel,applyPromotions}){
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>100)throw badRequest('Cart must contain between 1 and 100 items');
  const grouped=new Map();
  for(const entry of body.items){
    if(!entry||!Number.isSafeInteger(Number(entry.variantId))||Number(entry.variantId)<=0||!Number.isSafeInteger(Number(entry.qty))||Number(entry.qty)<=0)throw badRequest('Invalid cart item or quantity');
    const id=Number(entry.variantId),qty=(grouped.get(id)?.qty||0)+Number(entry.qty);
    if(!Number.isSafeInteger(qty))throw badRequest('Invalid quantity');
    grouped.set(id,{variantId:id,qty});
  }
  const items=[...grouped.values()];
  const {fulfillment_type,delivery_zone_id}=body;
  if(!['pickup','delivery'].includes(fulfillment_type))throw badRequest('Choose pickup or delivery');
    for (const item of items) {
      if (!item || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isSafeInteger(Number(item.variantId))) {
        throw badRequest('Invalid cart item or quantity');
      }
      item.qty = Number(item.qty);
      const [[variant]] = await db.query(
        `SELECT pv.retail_price, pv.discount_type, pv.discount_value, pv.product_id, p.category_id, p.brand_id,p.name AS product_name,pv.variant_label,
          pv.current_stock-COALESCE((SELECT SUM(quantity) FROM website_stock_reservations WHERE variant_id=pv.id AND state='active'),0) AS available_stock
         FROM product_variants pv JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ? AND pv.is_active = TRUE AND p.is_active = TRUE AND p.show_on_website = TRUE`, [item.variantId]
      );
      if (!variant) throw badRequest('A cart product is no longer available');
      if(Number(variant.available_stock)<item.qty)throw badRequest(`Insufficient stock for ${variant.product_name||'a cart item'}${variant.variant_label?` (${variant.variant_label})`:''}. Available: ${Math.max(0,Number(variant.available_stock))}. Update your cart to continue.`);
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
    let delivery_breakdown=null;
    if (fulfillment_type === 'delivery') {
      let feeResult;
      if (delivery_zone_id) {
        feeResult = await deliveryModel.calculateFee({ zone_id: Number(delivery_zone_id), total_weight_grams: 0, total_packs: totalPacks });
      } else {
        feeResult = await deliveryModel.calculateSelfDeliveryFee({ total_packs: totalPacks });
      }
      calculatedDeliveryFee = feeResult.total_fee;
      delivery_breakdown=feeResult;
    }

    const promotion = await applyPromotions(items.map(i => ({ ...i, variant_id: i.variantId, quantity: i.qty, unit_price: i.price })), body.coupon_code || null);
    if (promotion.couponError) throw badRequest(promotion.couponError);
    if (promotion.freeDelivery) calculatedDeliveryFee = 0;

  const subtotal=Math.round(items.reduce((sum,item)=>sum+item.price*item.qty,0)*100)/100;
  const discount_total=Math.round(Number(promotion.totalDiscount)*100)/100;
  const delivery_fee=Number(calculatedDeliveryFee);
  const grand_total=Math.round((subtotal-discount_total+delivery_fee)*100)/100;
  if(!Number.isFinite(grand_total)||grand_total<0)throw badRequest('Unable to calculate order total');
  const signature=require('node:crypto').createHash('sha256').update(JSON.stringify({items,subtotal,discount_total,delivery_fee,grand_total})).digest('hex');
  return {items,subtotal,discount_total,delivery_fee,grand_total,signature,delivery_breakdown,appliedPromotions:promotion.appliedPromotions||[],freeDelivery:!!promotion.freeDelivery};
};
