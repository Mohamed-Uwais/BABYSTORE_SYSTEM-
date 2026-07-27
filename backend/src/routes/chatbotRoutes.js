const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const whatsapp = require('../utils/whatsappSender');
const { upload } = require('../middleware/uploadMiddleware');

const PUBLIC_BASE = process.env.PUBLIC_URL || 'https://pos.littora.lk';
function toPublicUrl(localPath) {
  if (!localPath) return null;
  if (localPath.startsWith('http')) return localPath;
  return PUBLIC_BASE + (localPath.startsWith('/') ? '' : '/') + localPath;
}

const chatUploadDir = path.join(__dirname, '..', '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true });

router.get('/conversations', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*,
        (SELECT message_text FROM chatbot_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
        (SELECT sender FROM chatbot_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_sender,
        (SELECT COUNT(*) FROM chatbot_messages WHERE conversation_id = c.id) AS message_count,
        cust.full_name AS customer_name, cust.phone AS customer_phone
      FROM chatbot_conversations c
      LEFT JOIN customers cust ON cust.id = c.customer_id
      ORDER BY c.last_message_at DESC
      LIMIT 100
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const [convRows] = await db.query(
      `SELECT c.*, cust.full_name AS customer_name, cust.phone AS customer_phone
       FROM chatbot_conversations c
       LEFT JOIN customers cust ON cust.id = c.customer_id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (convRows.length === 0) return res.status(404).json({ message: 'Not found' });

    const [messages] = await db.query(
      `SELECT * FROM chatbot_messages WHERE conversation_id = ? ORDER BY id ASC`,
      [req.params.id]
    );
    res.json({ data: { conversation: convRows[0], messages } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/conversations/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });

    await db.query(
      `INSERT INTO chatbot_messages (conversation_id, sender, message_text, handled_by) VALUES (?, 'owner', ?, 'owner')`,
      [req.params.id, message]
    );
    await db.query(`UPDATE chatbot_conversations SET last_message_at = NOW() WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/conversations/:id/takeover', async (req, res) => {
  try {
    const { takeover } = req.body;
    await db.query(`UPDATE chatbot_conversations SET owner_takeover = ? WHERE id = ?`, [takeover ? 1 : 0, req.params.id]);
    res.json({ success: true, takeover });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/chatbot-alerts', async (req, res) => {
  try {
    const [newOrders] = await db.query(`
      SELECT o.order_number, o.grand_total, o.channel, o.created_at, c.full_name
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.channel IN ('whatsapp','instagram','messenger')
        AND o.created_at > NOW() - INTERVAL 24 HOUR
      ORDER BY o.created_at DESC LIMIT 10
    `);

    const [activeConvs] = await db.query(`
      SELECT COUNT(*) AS count FROM chatbot_conversations WHERE status = 'active'
    `);

    const [routingStats] = await db.query(`
      SELECT handled_by, COUNT(*) AS count, ROUND(AVG(response_time_ms)) AS avg_ms
      FROM message_routing_log
      WHERE created_at > NOW() - INTERVAL 24 HOUR
      GROUP BY handled_by
    `);

    res.json({
      data: {
        chatbot_orders: newOrders,
        active_conversations: activeConvs[0].count,
        routing_stats: routingStats,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Send product image to customer via WhatsApp ──
router.post('/conversations/:id/send-product-image', async (req, res) => {
  try {
    const { variant_id } = req.body;
    const [convRows] = await db.query(
      `SELECT c.channel, c.channel_user_id FROM chatbot_conversations c WHERE c.id = ?`,
      [req.params.id]
    );
    if (!convRows.length) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convRows[0];

    const [rows] = await db.query(
      `SELECT p.name, pv.variant_label, pv.retail_price, pv.image_url
       FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = ?`,
      [variant_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    const product = rows[0];
    if (!product.image_url) return res.status(400).json({ message: 'Product has no image' });

    const imageUrl = toPublicUrl(product.image_url);
    const caption = `${product.name} — ${product.variant_label}\nRs. ${Number(product.retail_price).toLocaleString()}`;

    if (conv.channel === 'whatsapp' && whatsapp.isConfigured()) {
      await whatsapp.sendImage(conv.channel_user_id, imageUrl, caption);
    }

    await db.query(
      `INSERT INTO chatbot_messages (conversation_id, sender, message_text, message_type, handled_by, image_url) VALUES (?, 'owner', ?, 'image', 'owner', ?)`,
      [req.params.id, caption, imageUrl]
    );
    await db.query(`UPDATE chatbot_conversations SET last_message_at = NOW() WHERE id = ?`, [req.params.id]);

    res.json({ success: true, imageUrl, caption });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Send custom image to customer ──
router.post('/conversations/:id/send-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const [convRows] = await db.query(
      `SELECT c.channel, c.channel_user_id FROM chatbot_conversations c WHERE c.id = ?`,
      [req.params.id]
    );
    if (!convRows.length) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convRows[0];

    const localPath = `/uploads/${req.file.filename}`;
    const imageUrl = toPublicUrl(localPath);
    const caption = req.body.caption || '';

    if (conv.channel === 'whatsapp' && whatsapp.isConfigured()) {
      await whatsapp.sendImage(conv.channel_user_id, imageUrl, caption);
    }

    await db.query(
      `INSERT INTO chatbot_messages (conversation_id, sender, message_text, message_type, handled_by, image_url) VALUES (?, 'owner', ?, 'image', 'owner', ?)`,
      [req.params.id, caption || '📷 Image', imageUrl]
    );
    await db.query(`UPDATE chatbot_conversations SET last_message_at = NOW() WHERE id = ?`, [req.params.id]);

    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Send image by URL (for receipts, quotations) ──
router.post('/conversations/:id/send-image-url', async (req, res) => {
  try {
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ message: 'image_url is required' });

    const [convRows] = await db.query(
      `SELECT c.channel, c.channel_user_id FROM chatbot_conversations c WHERE c.id = ?`,
      [req.params.id]
    );
    if (!convRows.length) return res.status(404).json({ message: 'Conversation not found' });
    const conv = convRows[0];

    const publicUrl = toPublicUrl(image_url);
    if (conv.channel === 'whatsapp' && whatsapp.isConfigured()) {
      await whatsapp.sendImage(conv.channel_user_id, publicUrl, caption || '');
    }

    await db.query(
      `INSERT INTO chatbot_messages (conversation_id, sender, message_text, message_type, handled_by, image_url) VALUES (?, 'owner', ?, 'image', 'owner', ?)`,
      [req.params.id, caption || '📷 Image', publicUrl]
    );
    await db.query(`UPDATE chatbot_conversations SET last_message_at = NOW() WHERE id = ?`, [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Search products for media picker ──
router.get('/products/search', async (req, res) => {
  try {
    const term = `%${req.query.q || ''}%`;
    const [rows] = await db.query(
      `SELECT pv.id AS variant_id, p.name, pv.variant_label, pv.retail_price, pv.image_url
       FROM product_variants pv JOIN products p ON p.id = pv.product_id
       WHERE p.is_active = 1 AND pv.is_active = 1 AND pv.image_url IS NOT NULL
         AND (p.name LIKE ? OR pv.variant_label LIKE ?)
       ORDER BY p.name LIMIT 12`,
      [term, term]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
