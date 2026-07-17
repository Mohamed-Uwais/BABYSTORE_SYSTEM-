const API_KEY = process.env.KOOMBIYO_API_KEY;
const BASE_URL = process.env.KOOMBIYO_API_BASE_URL || 'https://application.koombiyodelivery.lk/api';

async function koombiyoFetch(endpoint, body = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: API_KEY, ...body }),
  });
  const data = await res.json();
  return data;
}

async function createWaybill({ orderNumber, receiverName, receiverPhone, receiverAddress, description, quantity = 1, codAmount = 0, weight = 0.5 }) {
  return koombiyoFetch('/Aborting/CreateWaybill', {
    order_id: orderNumber,
    receiver_name: receiverName,
    receiver_address: receiverAddress,
    receiver_phone: receiverPhone,
    description: description || `Order ${orderNumber}`,
    quantity,
    cod_amount: codAmount,
    weight,
  });
}

async function trackOrder(waybillNumber) {
  return koombiyoFetch('/Aborting/track', { waybill_no: waybillNumber });
}

async function cancelWaybill(waybillNumber) {
  return koombiyoFetch('/Aborting/cancel', { waybill_no: waybillNumber });
}

async function getShippingLabel(waybillNumber) {
  return { url: `${BASE_URL}/Aborting/label/${waybillNumber}?apikey=${API_KEY}&format=THERMAL` };
}

module.exports = { createWaybill, trackOrder, cancelWaybill, getShippingLabel };
