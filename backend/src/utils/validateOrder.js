function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }
function numeric(value, label, integer = false) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') invalid(`${label} is required`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && (!Number.isSafeInteger(number) || number < 1))) invalid(`Invalid ${label}`);
  return number;
}
function normalizeOrder(payload) {
  if (!payload || !Array.isArray(payload.items) || !payload.items.length) invalid('Order must contain items');
  if (!Array.isArray(payload.payments) || !payload.payments.length) invalid('Payment is required');
  const items = payload.items.map(item => {
    if (!item) invalid('Invalid order item');
    const result = { ...item, variant_id: numeric(item.variant_id, 'variant', true), quantity: numeric(item.quantity, 'quantity', true), unit_price: numeric(item.unit_price, 'price'), discount_amount: numeric(item.discount_amount ?? 0, 'discount') };
    if (result.discount_amount > result.quantity * result.unit_price) invalid('Item discount exceeds its value');
    return result;
  });
  const payments = payload.payments.map(payment => {
    if (!payment || !['cash', 'card', 'bank_transfer', 'store_credit', 'pay_later', 'online_gateway', 'cod'].includes(payment.payment_method)) invalid('Invalid payment method');
    return { ...payment, amount: numeric(payment.amount, 'payment amount') };
  });
  const discount_total = numeric(payload.discount_total ?? 0, 'order discount');
  const delivery_fee = numeric(payload.delivery_fee ?? 0, 'delivery fee');
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price - item.discount_amount, 0);
  if (!Number.isFinite(subtotal + delivery_fee)) invalid('Order value is too large');
  if (discount_total > subtotal + delivery_fee) invalid('Order discount exceeds order value');
  return { ...payload, items, payments, discount_total, delivery_fee };
}
module.exports = { normalizeOrder };
