const axios = require('axios');
const logger = require('../utils/logger');

function isConfigured() {
  return process.env.INSTAGRAM_ACCESS_TOKEN && !process.env.INSTAGRAM_ACCESS_TOKEN.startsWith('PLACEHOLDER');
}

async function sendText(userId, text) {
  if (!isConfigured()) { logger.warn('Instagram not configured — message not sent'); return; }
  await axios.post(
    `https://graph.facebook.com/v21.0/me/messages`,
    { recipient: { id: userId }, message: { text } },
    { headers: { Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}` } }
  );
}

module.exports = { sendText, isConfigured };
