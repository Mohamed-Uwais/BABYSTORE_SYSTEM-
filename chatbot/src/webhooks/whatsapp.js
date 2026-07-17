const express = require('express');
const router = express.Router();
const smartRouter = require('../router/smartRouter');
const whatsappSender = require('../channels/whatsappSender');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body.object || body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          if (msg.type !== 'text') continue;

          const phone = msg.from;
          const text = msg.text?.body;
          if (!text) continue;

          logger.info(`[WhatsApp] ${phone}: ${text}`);

          const result = await smartRouter.processMessage({
            message: text,
            channel: 'whatsapp',
            senderInfo: { phone, channelUserId: phone },
          });

          if (result && result.text) {
            await whatsappSender.sendText(phone, result.text);
            if (result.images && result.images.length > 0) {
              await whatsappSender.sendImage(phone, result.images[0], '');
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error('WhatsApp webhook error:', err.message);
  }
});

module.exports = router;
