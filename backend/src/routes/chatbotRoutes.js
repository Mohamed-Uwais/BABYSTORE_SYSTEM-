const express = require('express');
const router = express.Router();
const db = require('../config/db');

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

module.exports = router;
