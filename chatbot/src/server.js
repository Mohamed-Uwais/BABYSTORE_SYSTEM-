require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conversationManager = require('./services/conversationManager');
const smartRouter = require('./router/smartRouter');
const ghostRecovery = require('./services/ghostRecovery');
const whatsappWebhook = require('./webhooks/whatsapp');
const instagramWebhook = require('./webhooks/instagram');
const messengerWebhook = require('./webhooks/messenger');
const logger = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());

// Webhooks
app.use('/webhook/whatsapp', whatsappWebhook);
app.use('/webhook/instagram', instagramWebhook);
app.use('/webhook/messenger', messengerWebhook);

// Simulator endpoint (local testing without Meta)
app.post('/api/simulate', async (req, res) => {
  try {
    const { message, phone } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const startTime = Date.now();
    const result = await smartRouter.processMessage({
      message,
      channel: 'simulator',
      senderInfo: { phone: phone || 'sim_user', channelUserId: phone || 'sim_user' },
    });

    res.json({
      reply: result?.text || '(no response)',
      provider: result?.provider || 'none',
      responseTime: Date.now() - startTime,
      conversationId: result?.conversationId,
    });
  } catch (err) {
    logger.error('Simulate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POS Integration — Conversations API
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await conversationManager.getActiveConversations();
    res.json({ data: conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await conversationManager.getConversationById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    const messages = await conversationManager.getHistory(conversation.id, 100);
    res.json({ data: { conversation, messages } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    await conversationManager.saveMessage(req.params.id, 'owner', message, { handledBy: 'owner' });
    await conversationManager.updateLastMessage(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/conversations/:id/takeover', async (req, res) => {
  try {
    const { takeover } = req.body;
    await conversationManager.setTakeover(req.params.id, takeover);
    res.json({ success: true, takeover });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics — routing stats
app.get('/api/analytics/routing', async (req, res) => {
  try {
    const db = require('./config/db');
    const [stats] = await db.query(`
      SELECT handled_by, COUNT(*) AS count, ROUND(AVG(response_time_ms)) AS avg_time_ms
      FROM message_routing_log
      GROUP BY handled_by
      ORDER BY count DESC
    `);
    const [total] = await db.query(`SELECT COUNT(*) AS total FROM message_routing_log`);
    res.json({ data: { stats, total: total[0].total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'liya-chatbot' }));

async function start() {
  await conversationManager.ensureTables();

  ghostRecovery.start();

  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    logger.info(`🤖 Liya chatbot running on port ${PORT}`);
    logger.info(`   Simulator: POST http://localhost:${PORT}/api/simulate`);
    logger.info(`   WhatsApp:  /webhook/whatsapp`);
    logger.info(`   Instagram: /webhook/instagram`);
    logger.info(`   Messenger: /webhook/messenger`);
  });
}

start();
