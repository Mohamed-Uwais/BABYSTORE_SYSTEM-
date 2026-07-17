function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function calcDiscounted(v) {
  if (v.discount_type === 'percent') return Math.round(v.retail_price * (1 - v.discount_value / 100));
  if (v.discount_type === 'amount') return Math.round(v.retail_price - v.discount_value);
  return v.retail_price;
}

function productCard(v) {
  const hasDiscount = v.discount_type && v.discount_type !== 'none' && v.discount_value > 0;
  const price = hasDiscount
    ? `~${formatPrice(v.retail_price)}~ → ${formatPrice(calcDiscounted(v))}`
    : formatPrice(v.retail_price);
  const stock = v.current_stock > 0 ? '✅ In stock' : '❌ Out of stock';
  return `📦 *${v.product_name || v.name}* — ${v.variant_label}\n${price} | ${stock}`;
}

function productList(variants, intro) {
  let msg = intro || "Here's what we have! 😊\n";
  msg += '\n';
  for (const v of variants) msg += productCard(v) + '\n\n';
  msg += 'Want to order any of these?';
  return msg;
}

function orderSummary(items, deliveryFee, total) {
  let msg = '🛒 *Order Summary*\n\n';
  for (const item of items) {
    msg += `• ${item.name} × ${item.quantity} — ${formatPrice(item.lineTotal)}\n`;
  }
  if (deliveryFee > 0) msg += `\n🚚 Delivery: ${formatPrice(deliveryFee)}`;
  msg += `\n\n💰 *Total: ${formatPrice(total)}*`;
  msg += '\n\nShall I confirm this order? (yes/no)';
  return msg;
}

function orderConfirmation(orderNumber, total) {
  return `✅ *Order Placed!*\n\n📋 Order #: *${orderNumber}*\n💰 Total: ${formatPrice(total)}\n\nYou can track your order anytime at:\n🔗 littora.lk/track?order=${orderNumber}\n\nThank you for shopping with Littora! 😊`;
}

function promotionCard(promo) {
  let msg = `🎉 *${promo.title}*`;
  if (promo.description) msg += `\n${promo.description}`;
  if (promo.coupon_code) msg += `\n🏷️ Code: *${promo.coupon_code}*`;
  return msg;
}

module.exports = { formatPrice, calcDiscounted, productCard, productList, orderSummary, orderConfirmation, promotionCard };
