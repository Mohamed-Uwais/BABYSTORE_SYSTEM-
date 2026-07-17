const express = require('express');
const router = express.Router();
const smartRouter = require('../router/smartRouter');
const instagramSender = require('../channels/instagramSender');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Instagram webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const messaging = entry.messaging || [];
      for (const event of messaging) {
        if (!event.message?.text) continue;

        const senderId = event.sender?.id;
        const text = event.message.text;
        if (!senderId || !text) continue;

        logger.info(`[Instagram] ${senderId}: ${text}`);

        const result = await smartRouter.processMessage({
          message: text,
          channel: 'instagram',
          senderInfo: { channelUserId: senderId },
        });

        if (result && result.text) {
          await instagramSender.sendText(senderId, result.text);
        }
      }
    }
  } catch (err) {
    logger.error('Instagram webhook error:', err.message);
  }
});

module.exports = router;
