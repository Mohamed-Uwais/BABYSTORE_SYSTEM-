const axios = require('axios');

const API_VERSION = 'v21.0';

function isConfigured() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  return id && token && !id.startsWith('PLACEHOLDER') && !token.startsWith('PLACEHOLDER');
}

async function sendText(phone, text) {
  if (!isConfigured()) return;
  const { WHATSAPP_PHONE_NUMBER_ID: id, WHATSAPP_ACCESS_TOKEN: token } = process.env;
  await axios.post(
    `https://graph.facebook.com/${API_VERSION}/${id}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function sendImage(phone, imageUrl, caption = '') {
  if (!isConfigured()) return;
  const { WHATSAPP_PHONE_NUMBER_ID: id, WHATSAPP_ACCESS_TOKEN: token } = process.env;
  await axios.post(
    `https://graph.facebook.com/${API_VERSION}/${id}/messages`,
    { messaging_product: 'whatsapp', to: phone, type: 'image', image: { link: imageUrl, caption } },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = { sendText, sendImage, isConfigured };
