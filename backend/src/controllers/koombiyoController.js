const koombiyo = require('../services/koombiyoService');
const db = require('../config/db');

async function createWaybill(req, res) {
  try {
    const { order_id } = req.body;
    const [[order]] = await db.query(
      `SELECT o.order_number, o.delivery_address, d.receiver_name, d.receiver_phone, d.receiver_address
       FROM orders o LEFT JOIN deliveries d ON d.order_id = o.id WHERE o.id = ?`, [order_id]
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const result = await koombiyo.createWaybill({
      orderNumber: order.order_number,
      receiverName: order.receiver_name || 'Customer',
      receiverPhone: order.receiver_phone || '',
      receiverAddress: order.receiver_address || order.delivery_address || '',
      description: `Order ${order.order_number}`,
    });

    if (result.waybill_no) {
      await db.query(
        `UPDATE deliveries SET tracking_number = ?, courier_id = (SELECT id FROM couriers WHERE code = 'koombiyo' LIMIT 1), status = 'shipped' WHERE order_id = ?`,
        [result.waybill_no, order_id]
      );
      await db.query(`UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'processing'`, [order_id]);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo createWaybill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function trackOrder(req, res) {
  try {
    const { waybill_no } = req.params;
    const result = await koombiyo.trackOrder(waybill_no);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo track error:', error.message);
    res.status(502).json({ success: false, message: 'Tracking unavailable, try again later' });
  }
}

async function cancelShipment(req, res) {
  try {
    const { waybill_no } = req.params;
    const result = await koombiyo.cancelWaybill(waybill_no);
    if (result.status === 'success' || result.success) {
      await db.query(
        `UPDATE deliveries SET status = 'cancelled' WHERE tracking_number = ?`, [waybill_no]
      );
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo cancel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getLabel(req, res) {
  try {
    const { waybill_no } = req.params;
    const result = await koombiyo.getShippingLabel(waybill_no);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo label error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function webhook(req, res) {
  try {
    const { waybill_no, status, delivered_date } = req.body;
    if (waybill_no && status) {
      const statusMap = { 'Delivered': 'delivered', 'Returned': 'returned', 'Dispatched': 'in_transit' };
      const mappedStatus = statusMap[status] || status.toLowerCase();
      await db.query(
        `UPDATE deliveries SET status = ?, updated_at = NOW() WHERE tracking_number = ?`,
        [mappedStatus, waybill_no]
      );
      if (mappedStatus === 'delivered') {
        await db.query(
          `UPDATE orders SET status = 'delivered' WHERE id = (SELECT order_id FROM deliveries WHERE tracking_number = ? LIMIT 1)`,
          [waybill_no]
        );
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Koombiyo webhook error:', error);
    res.status(500).json({ success: false });
  }
}

module.exports = { createWaybill, trackOrder, cancelShipment, getLabel, webhook };
