// Koombiyo Delivery API adapter
// TODO: Replace with real API calls once credentials are obtained
// API docs: https://www.koombiyo.lk/api-documentation

async function createShipment({ receiver_name, receiver_phone, receiver_address, order_number, weight_grams }) {
  // TODO: POST to Koombiyo API to create a shipment
  // Returns: { tracking_number, waybill_number, status }
  throw new Error('Koombiyo API not configured yet. Please enter tracking number manually.');
}

async function getTracking(trackingNumber) {
  // TODO: GET from Koombiyo API to check shipment status
  // Returns: { status, last_update, events: [...] }
  return {
    status: 'API not configured',
    message: 'Koombiyo API integration pending. Track manually on their website.',
    tracking_number: trackingNumber,
  };
}

module.exports = { createShipment, getTracking };
