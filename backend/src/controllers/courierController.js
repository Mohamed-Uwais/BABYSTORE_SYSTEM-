const courierModel = require('../models/courierModel');

async function getCouriers(req, res) {
  try {
    const couriers = await courierModel.getCouriers();
    res.json({ success: true, data: couriers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function assignDelivery(req, res) {
  try {
    const orderId = req.params.id || req.body.order_id;
    if (!orderId) return res.status(400).json({ success: false, message: 'order_id required' });
    const { courier_code, tracking_number, receiver_name, receiver_phone, receiver_address } = req.body;
    let courier_id = null;
    if (courier_code) {
      const courier = await courierModel.getCourierByCode(courier_code);
      if (courier) courier_id = courier.id;
    }
    const delivery = await courierModel.assignDelivery(orderId, {
      courier_id, tracking_number, receiver_name, receiver_phone, receiver_address,
    });
    res.json({ success: true, data: delivery });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function getTracking(req, res) {
  try {
    const result = await courierModel.getTracking(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'No delivery record found' });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getDeliveryOrders(req, res) {
  try {
    const { status, method, tab } = req.query;
    const data = await courierModel.getDeliveryOrders({ status, method, tab });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateTracking(req, res) {
  try {
    const data = await courierModel.updateTracking(req.params.id, req.body.tracking_number);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

module.exports = { getCouriers, assignDelivery, getTracking, getDeliveryOrders, updateTracking };
