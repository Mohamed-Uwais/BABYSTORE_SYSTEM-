const geminiService = require('./geminiService');
const claudeService = require('./claudeService');
const logger = require('../utils/logger');

async function callAI(conversationHistory, customerContext) {
  // Try Gemini first (primary — fast + cheap)
  try {
    const response = await geminiService.call(conversationHistory, customerContext);
    logger.info('AI response from: Gemini');
    return { text: response, provider: 'gemini' };
  } catch (error) {
    logger.warn('Gemini failed, falling back to Claude:', error.message);
  }

  // Fallback to Claude
  try {
    const response = await claudeService.call(conversationHistory, customerContext);
    logger.info('AI response from: Claude (fallback)');
    return { text: response, provider: 'claude' };
  } catch (error) {
    logger.error('All AI providers failed:', error.message);
    return {
      text: "Sorry, I'm having a little trouble right now! 😅 Please try again in a moment, or message us on WhatsApp and we'll help you directly.",
      provider: 'fallback',
    };
  }
}

module.exports = { callAI };
