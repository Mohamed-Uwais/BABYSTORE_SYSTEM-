const db = require('../config/db');
const whatsapp = require('./whatsappSender');

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://littora.lk';

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getNotifSettings() {
  try {
    const [[row]] = await db.query(
      'SELECT wa_notify_confirmed, wa_notify_shipped, wa_notify_delivered FROM store_settings WHERE id = 1'
    );
    return row || {};
  } catch {
    return {};
  }
}

function buildConfirmedMessage(name, orderNumber, grandTotal, fulfillmentLabel) {
  const trackUrl = `${PUBLIC_URL}/track?order=${orderNumber}`;
  return `Hi ${name}! 👋

Your order has been confirmed! ✅

📦 Order: ${orderNumber}
💰 Total: ${money(grandTotal)}
🚚 Delivery: ${fulfillmentLabel}

Track your order here:
${trackUrl}

We'll notify you when it ships!

— Littora 🍼`;
}

function buildShippedMessage(name, orderNumber, courierName, trackingNumber) {
  const trackUrl = `${PUBLIC_URL}/track?order=${orderNumber}`;
  return `Hi ${name}! 📦

Your order ${orderNumber} has been shipped!

🚚 Courier: ${courierName}
📋 Tracking: ${trackingNumber || 'Pending'}

Track: ${trackUrl}

— Littora 🍼`;
}

function buildDeliveredMessage(name, orderNumber) {
  return `Hi ${name}! ✅

Your order ${orderNumber} has been delivered!

Hope you love it! 😊 If you have any issues, just reply here.

Thanks for shopping with Littora! 🍼`;
}

function buildRejectedMessage(name, orderNumber, reason) {
  return `Hi ${name || 'there'}, we're sorry but your order ${orderNumber} could not be processed.${reason ? ` Reason: ${reason}` : ''} Please contact us if you need help.

— Littora 🍼`;
}

function buildOutForDeliveryMessage(name, orderNumber) {
  const trackUrl = `${PUBLIC_URL}/track?order=${orderNumber}`;
  return `Great news, ${name}! 🚛

Your order ${orderNumber} is out for delivery today!

Track: ${trackUrl}

— Littora 🍼`;
}

function buildReturnedMessage(name, orderNumber) {
  return `Hi ${name || 'there'}, your order ${orderNumber} was returned by the courier. Please contact us for assistance.

— Littora 🍼`;
}

async function logMessage(phone, message) {
  try {
    await db.query(
      `INSERT INTO chatbot_messages (phone, direction, message_type, body, created_at) VALUES (?, 'outgoing', 'text', ?, NOW())`,
      [phone, message]
    );
  } catch { /* table may not exist yet */ }
}

async function sendNotification(phone, message, settingKey) {
  if (!phone || !whatsapp.isConfigured()) return;
  try {
    const settings = await getNotifSettings();
    if (settings[settingKey] === 0) return;
    await whatsapp.sendText(phone, message);
    await logMessage(phone, message);
  } catch (e) {
    console.error(`WhatsApp ${settingKey} notification failed:`, e.message);
  }
}

async function notifyConfirmed(orderId) {
  try {
    const [[o]] = await db.query(
      `SELECT o.order_number, o.grand_total, o.fulfillment_type,
              c.phone, c.full_name,
              cr.name AS courier_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN order_deliveries od ON od.order_id = o.id
       LEFT JOIN couriers cr ON cr.id = od.courier_id
       WHERE o.id = ?`, [orderId]
    );
    if (!o?.phone) return;
    const fulfillmentLabels = {
      pickup: 'Pickup',
      self_delivery: 'Our Delivery',
      courier_delivery: o.courier_name || 'Courier',
    };
    const msg = buildConfirmedMessage(
      o.full_name || 'there',
      o.order_number,
      o.grand_total,
      fulfillmentLabels[o.fulfillment_type] || 'Pickup'
    );
    await sendNotification(o.phone, msg, 'wa_notify_confirmed');
  } catch (e) {
    console.error('notifyConfirmed error:', e.message);
  }
}

async function notifyShipped(orderId, courierName, trackingNumber) {
  try {
    const [[o]] = await db.query(
      `SELECT o.order_number, c.phone, c.full_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`, [orderId]
    );
    if (!o?.phone) return;
    const msg = buildShippedMessage(o.full_name || 'there', o.order_number, courierName, trackingNumber);
    await sendNotification(o.phone, msg, 'wa_notify_shipped');
  } catch (e) {
    console.error('notifyShipped error:', e.message);
  }
}

async function notifyDelivered(orderId) {
  try {
    const [[o]] = await db.query(
      `SELECT o.order_number, c.phone, c.full_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`, [orderId]
    );
    if (!o?.phone) return;
    const msg = buildDeliveredMessage(o.full_name || 'there', o.order_number);
    await sendNotification(o.phone, msg, 'wa_notify_delivered');
  } catch (e) {
    console.error('notifyDelivered error:', e.message);
  }
}

async function notifyRejected(orderId, reason) {
  try {
    const [[o]] = await db.query(
      `SELECT o.order_number, c.phone, c.full_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`, [orderId]
    );
    if (!o?.phone) return;
    const msg = buildRejectedMessage(o.full_name || 'there', o.order_number, reason);
    await sendNotification(o.phone, msg, 'wa_notify_confirmed');
  } catch (e) {
    console.error('notifyRejected error:', e.message);
  }
}

async function notifyStatusChange(orderId, mappedStatus, courierName, trackingNumber) {
  try {
    const [[o]] = await db.query(
      `SELECT o.order_number, c.phone, c.full_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`, [orderId]
    );
    if (!o?.phone) return;
    const name = o.full_name || 'there';
    let msg, key;
    switch (mappedStatus) {
      case 'in_transit':
        msg = buildShippedMessage(name, o.order_number, courierName || 'Koombiyo', trackingNumber);
        key = 'wa_notify_shipped';
        break;
      case 'out_for_delivery':
        msg = buildOutForDeliveryMessage(name, o.order_number);
        key = 'wa_notify_shipped';
        break;
      case 'delivered':
        msg = buildDeliveredMessage(name, o.order_number);
        key = 'wa_notify_delivered';
        break;
      case 'returned':
        msg = buildReturnedMessage(name, o.order_number);
        key = 'wa_notify_delivered';
        break;
      default:
        return;
    }
    await sendNotification(o.phone, msg, key);
  } catch (e) {
    console.error('notifyStatusChange error:', e.message);
  }
}

module.exports = {
  notifyConfirmed,
  notifyShipped,
  notifyDelivered,
  notifyRejected,
  notifyStatusChange,
};
