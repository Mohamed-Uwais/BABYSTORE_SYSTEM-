const axios = require('axios');
const logger = require('../utils/logger');

const API_VERSION = 'v21.0';

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  };
}

function isConfigured() {
  const c = getConfig();
  return c.phoneNumberId && c.accessToken && !c.phoneNumberId.startsWith('PLACEHOLDER') && !c.accessToken.startsWith('PLACEHOLDER');
}

async function sendText(phone, text) {
  if (!isConfigured()) { logger.warn('WhatsApp not configured — message not sent'); return; }
  const { phoneNumberId, accessToken } = getConfig();
  await axios.post(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

async function sendImage(phone, imageUrl, caption) {
  if (!isConfigured()) { logger.warn('WhatsApp not configured — image not sent'); return; }
  const { phoneNumberId, accessToken } = getConfig();
  await axios.post(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'image', image: { link: imageUrl, caption } },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

module.exports = { sendText, sendImage, isConfigured };
