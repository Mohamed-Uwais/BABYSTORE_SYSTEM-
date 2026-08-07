const API_KEY = process.env.KOOMBIYO_API_KEY;
const BASE_URL = process.env.KOOMBIYO_API_BASE_URL || 'https://application.koombiyodelivery.lk/api';

async function koombiyoFetch(endpoint, body = {}) {
  if (!API_KEY) throw new Error('Koombiyo API key not configured');

  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => params.append(key, String(value)));
  params.append('apikey', API_KEY);

  let res;
  try {
    res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err) {
    console.error(`Koombiyo network error [${endpoint}]:`, err.message);
    throw new Error(`Koombiyo API unreachable: ${err.message}`);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`Koombiyo non-JSON response [${endpoint}] (${res.status}):`, text.substring(0, 500));
    throw new Error(`Koombiyo returned non-JSON (HTTP ${res.status})`);
  }
  if (!res.ok) {
    console.error(`Koombiyo API error [${endpoint}] (${res.status}):`, JSON.stringify(data));
    throw new Error(data.message || data.error || `Koombiyo API returned ${res.status}`);
  }
  return data;
}

async function createWaybill({ orderNumber, receiverName, receiverPhone, receiverAddress, description, quantity = 1, codAmount = 0, weight = 0.5 }) {
  const result = await koombiyoFetch('Addorders/users', {
    order_id: orderNumber,
    receiver_name: receiverName,
    receiver_address: receiverAddress,
    receiver_phone: receiverPhone,
    description: description || `Order ${orderNumber}`,
    quantity,
    cod_amount: codAmount,
    weight,
  });
  if (result.status !== 200) {
    throw new Error(result.message || 'Failed to create waybill');
  }
  return result;
}

async function trackOrder(waybillNumber) {
  const result = await koombiyoFetch('Allorders/users', {
    waybillid: waybillNumber,
    offset: 0,
    limit: 1,
  });
  return result?.cust_orders?.[0] || {};
}

async function getOrderHistory(waybillNumber) {
  return koombiyoFetch('Orderhistory/users', { waybillid: waybillNumber });
}

async function cancelWaybill(waybillNumber) {
  return koombiyoFetch('Returnreceive/users', { orderWaybillid: waybillNumber });
}

async function getShippingLabel(waybillNumber) {
  return { url: `${BASE_URL}/Aborting/label/${waybillNumber}?apikey=${API_KEY}&format=THERMAL` };
}

function generateTrackingURL(waybillNumber, phone) {
  return `https://koombiyodelivery.lk/Track/track_id?id=${encodeURIComponent(waybillNumber)}&phone=${encodeURIComponent(phone)}`;
}

module.exports = { createWaybill, trackOrder, getOrderHistory, cancelWaybill, getShippingLabel, generateTrackingURL };
