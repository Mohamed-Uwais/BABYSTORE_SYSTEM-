const geminiService = require('./geminiService');
const claudeService = require('./claudeService');
const logger = require('../utils/logger');

const FAKE_PRODUCT_PATTERNS = [
  /littora\s+(premium|classic|super|ultra|basic|standard|plus)\s+\w+/i,
  /our\s+(premium|classic|special)\s+(diapers?|wipes?|pants?)/i,
];

const REAL_BRANDS = ['pretty baby', 'global', 'global ii', 'mum&me', 'mum & me'];

function detectHallucination(text, knownProducts) {
  if (!knownProducts || knownProducts.size === 0) {
    for (const pat of FAKE_PRODUCT_PATTERNS) {
      if (pat.test(text)) {
        logger.warn('Hallucination detected (fake product pattern):', text.match(pat)?.[0]);
        return true;
      }
    }
    return false;
  }

  const productMentionPattern = /(?:our|the|try|recommend|suggest|have)\s+([A-Z][A-Z\s&]+(?:Diapers?|Pants?|Wipes?|Pack))/g;
  let match;
  while ((match = productMentionPattern.exec(text)) !== null) {
    const mentioned = match[1].trim().toLowerCase();
    const isKnown = [...knownProducts].some(known =>
      mentioned.includes(known) || known.includes(mentioned)
    );
    const isRealBrand = REAL_BRANDS.some(b => mentioned.includes(b));
    if (!isKnown && !isRealBrand) {
      logger.warn('Hallucination detected — unknown product mentioned:', match[1].trim());
      return true;
    }
  }

  if (/littora\s+(premium|classic|super|ultra)/i.test(text)) {
    logger.warn('Hallucination detected — "Littora" used as product brand');
    return true;
  }

  return false;
}

const SAFE_FALLBACK = "I'd like to help you find the right product. Could you tell me the brand or size you're looking for?";

async function callAI(conversationHistory, customerContext) {
  let geminiError = null;
  let claudeError = null;

  // Try Gemini first (primary — fast + cheap)
  try {
    const response = await geminiService.call(conversationHistory, customerContext);
    logger.info('AI response from: Gemini');
    if (detectHallucination(response.text, response.knownProducts)) {
      logger.warn('Gemini response blocked (hallucination). Returning safe fallback.');
      return { text: SAFE_FALLBACK, images: [], provider: 'gemini-guarded' };
    }
    return { text: response.text, images: response.images || [], provider: 'gemini' };
  } catch (error) {
    geminiError = error;
    logger.warn('Gemini failed:', error.message, error.stack?.split('\n')[1] || '');
  }

  // Fallback to Claude (skip if API key is placeholder)
  const claudeKey = process.env.ANTHROPIC_API_KEY || '';
  if (claudeKey && !claudeKey.startsWith('PLACEHOLDER')) {
    try {
      const response = await claudeService.call(conversationHistory, customerContext);
      logger.info('AI response from: Claude (fallback)');
      if (detectHallucination(response.text, response.knownProducts)) {
        logger.warn('Claude response blocked (hallucination). Returning safe fallback.');
        return { text: SAFE_FALLBACK, images: [], provider: 'claude-guarded' };
      }
      return { text: response.text, images: response.images || [], provider: 'claude' };
    } catch (error) {
      claudeError = error;
      logger.error('Claude fallback failed:', error.message, error.stack?.split('\n')[1] || '');
    }
  } else {
    logger.warn('Claude skipped: ANTHROPIC_API_KEY is missing or placeholder');
  }

  // If Claude was skipped/failed, retry Gemini once
  if (geminiError) {
    try {
      logger.info('Retrying Gemini after Claude unavailable...');
      const response = await geminiService.call(conversationHistory, customerContext);
      logger.info('AI response from: Gemini (retry)');
      if (detectHallucination(response.text, response.knownProducts)) {
        return { text: SAFE_FALLBACK, images: [], provider: 'gemini-retry-guarded' };
      }
      return { text: response.text, images: response.images || [], provider: 'gemini' };
    } catch (error) {
      logger.error('Gemini retry also failed:', error.message);
    }
  }

  logger.error(`All AI providers failed. Gemini: ${geminiError?.message || 'skipped'}, Claude: ${claudeError?.message || 'skipped/no key'}`);
  return {
    text: "I'm sorry, I wasn't able to process that right now. Could you try again in a moment? You can ask me about any product, check prices, or track your order.",
    images: [],
    provider: 'fallback',
  };
}

module.exports = { callAI };
