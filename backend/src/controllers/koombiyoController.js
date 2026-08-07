const koombiyo = require('../services/koombiyoService');
const db = require('../config/db');
const notifier = require('../utils/orderNotifier');

async function createWaybill(req, res) {
  try {
    const { order_id } = req.body;
    const [[order]] = await db.query(
      `SELECT o.order_number, o.grand_total, o.delivery_fee, o.delivery_address,
              od.receiver_name, od.receiver_phone, od.receiver_address
       FROM orders o LEFT JOIN order_deliveries od ON od.order_id = o.id WHERE o.id = ?`, [order_id]
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const codAmount = Number(order.grand_total) || 0;
    const result = await koombiyo.createWaybill({
      orderNumber: order.order_number,
      receiverName: order.receiver_name || 'Customer',
      receiverPhone: order.receiver_phone || '',
      receiverAddress: order.receiver_address || order.delivery_address || '',
      description: `Order ${order.order_number}`,
      codAmount,
    });

    if (result.waybill_no) {
      await db.query(
        `UPDATE order_deliveries SET tracking_number = ?, courier_id = (SELECT id FROM couriers WHERE code = 'koombiyo' LIMIT 1), delivery_status = 'shipped' WHERE order_id = ?`,
        [result.waybill_no, order_id]
      );
      await db.query(`UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'processing'`, [order_id]);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo createWaybill error:', error.message);
    const msg = error.message || 'Koombiyo API error';
    const status = msg.includes('unreachable') ? 503 : msg.includes('not configured') ? 501 : 502;
    res.status(status).json({ success: false, message: msg });
  }
}

async function trackOrder(req, res) {
  try {
    const { waybill_no } = req.params;
    const result = await koombiyo.trackOrder(waybill_no);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo track error:', error.response?.data || error.message);
    res.status(502).json({ success: false, message: `Koombiyo tracking error: ${error.message}` });
  }
}

async function cancelShipment(req, res) {
  try {
    const { waybill_no } = req.params;
    const result = await koombiyo.cancelWaybill(waybill_no);
    if (result.status === 'success' || result.success) {
      await db.query(
        `UPDATE order_deliveries SET delivery_status = 'cancelled' WHERE tracking_number = ?`, [waybill_no]
      );
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Koombiyo cancel error:', error.message);
    res.status(502).json({ success: false, message: error.message || 'Cancellation failed' });
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
    console.log('Koombiyo webhook received:', JSON.stringify(req.body));
    const { waybill_no, status, delivered_date } = req.body;
    if (!waybill_no || !status) return res.json({ success: true });

    const statusMap = {
      'Delivered': 'delivered', 'Returned': 'returned', 'Dispatched': 'in_transit',
      'Picked Up': 'picked_up', 'Out for Delivery': 'out_for_delivery',
    };
    const mappedStatus = statusMap[status] || status.toLowerCase().replace(/\s+/g, '_');

    const [[delivery]] = await db.query(
      `SELECT od.order_id, od.delivery_status FROM order_deliveries od WHERE od.tracking_number = ?`, [waybill_no]
    );
    if (!delivery) return res.json({ success: true });

    if (delivery.delivery_status === mappedStatus) return res.json({ success: true });

    await db.query(
      `UPDATE order_deliveries SET delivery_status = ?, updated_at = NOW() WHERE tracking_number = ?`,
      [mappedStatus, waybill_no]
    );

    const orderStatus = mappedStatus === 'delivered' ? 'delivered' : (mappedStatus === 'returned' ? 'cancelled' : null);
    if (orderStatus) {
      await db.query(`UPDATE orders SET status = ? WHERE id = ? AND status NOT IN ('delivered','cancelled','refunded')`, [orderStatus, delivery.order_id]);
    }

    await db.query(
      `INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)`,
      [delivery.order_id, mappedStatus, `Koombiyo: ${status} (tracking: ${waybill_no})`]
    );

    notifier.notifyStatusChange(delivery.order_id, mappedStatus, 'Koombiyo', waybill_no);

    res.json({ success: true });
  } catch (error) {
    console.error('Koombiyo webhook error:', error);
    res.status(500).json({ success: false });
  }
}

// On-demand tracking with 5-minute cache
const trackingCache = new Map();
async function trackOnDemand(req, res) {
  try {
    const { order_id } = req.params;
    const [[delivery]] = await db.query(
      `SELECT od.tracking_number, od.courier_id, od.delivery_status, c.code AS courier_code, c.tracking_url_template
       FROM order_deliveries od LEFT JOIN couriers c ON c.id = od.courier_id WHERE od.order_id = ?`, [order_id]
    );
    if (!delivery || !delivery.tracking_number) {
      return res.status(404).json({ success: false, message: 'No tracking info found' });
    }

    if (delivery.courier_code === 'koombiyo') {
      const cacheKey = delivery.tracking_number;
      const cached = trackingCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
        return res.json({ success: true, data: { ...cached.data, cached: true } });
      }

      const result = await koombiyo.trackOrder(delivery.tracking_number);

      if (result.status) {
        const statusMap = {
          'Delivered': 'delivered', 'Returned': 'returned', 'Dispatched': 'in_transit',
          'Picked Up': 'picked_up', 'Out for Delivery': 'out_for_delivery',
        };
        const mapped = statusMap[result.status] || result.status.toLowerCase().replace(/\s+/g, '_');
        if (mapped !== delivery.delivery_status) {
          await db.query('UPDATE order_deliveries SET delivery_status = ?, updated_at = NOW() WHERE order_id = ?', [mapped, order_id]);
          await db.query(
            'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
            [order_id, mapped, `Koombiyo poll: ${result.status}`]
          );
          if (mapped === 'delivered') {
            await db.query(`UPDATE orders SET status = 'delivered' WHERE id = ? AND status NOT IN ('delivered','cancelled','refunded')`, [order_id]);
          }
        }
      }

      trackingCache.set(cacheKey, { ts: Date.now(), data: result });
      return res.json({ success: true, data: result });
    }

    // Fardar or other — return tracking URL
    const fardar = require('../couriers/fardar');
    const trackingUrl = fardar.getTrackingUrl(delivery.tracking_number, delivery.tracking_url_template);
    return res.json({ success: true, data: { status: delivery.delivery_status || 'unknown', tracking_url: trackingUrl, tracking_number: delivery.tracking_number } });
  } catch (error) {
    console.error('Track on-demand error:', error.message);
    res.status(502).json({ success: false, message: 'Tracking unavailable' });
  }
}

module.exports = { createWaybill, trackOrder, cancelShipment, getLabel, webhook, trackOnDemand };
