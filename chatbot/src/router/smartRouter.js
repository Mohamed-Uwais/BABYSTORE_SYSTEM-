const conversationManager = require('../services/conversationManager');
const customerService = require('../services/customerService');
const patternMatcher = require('./patternMatcher');
const aiRouter = require('../ai/aiRouter');
const logger = require('../utils/logger');

async function processMessage({ message, channel, senderInfo }) {
  const startTime = Date.now();

  const conversation = await conversationManager.getOrCreate(channel, senderInfo);

  if (conversation.owner_takeover) {
    await conversationManager.saveMessage(conversation.id, 'customer', message);
    await conversationManager.updateLastMessage(conversation.id);
    logger.info('Owner takeover active — message saved, bot silent');
    return null;
  }

  const customer = senderInfo.phone
    ? await customerService.findByPhone(senderInfo.phone)
    : null;

  await conversationManager.saveMessage(conversation.id, 'customer', message);

  // LAYER 1: Pattern Matcher (zero AI cost)
  const patternResult = await patternMatcher.match(message, customer);
  if (patternResult) {
    const elapsed = Date.now() - startTime;
    logger.info(`[Pattern Matcher] intent=${patternResult.intent} time=${elapsed}ms`);

    await conversationManager.saveMessage(conversation.id, 'bot', patternResult.text, {
      handledBy: 'pattern_matcher',
      intent: patternResult.intent,
      responseTimeMs: elapsed,
    });
    await conversationManager.logRouting(conversation.id, message, 'pattern_matcher', patternResult.intent, elapsed);
    await conversationManager.updateLastMessage(conversation.id);

    return { text: patternResult.text, images: patternResult.images, provider: 'pattern_matcher', conversationId: conversation.id };
  }

  // LAYERS 2+3: AI needed
  const history = await conversationManager.getHistory(conversation.id, 20);
  let customerContext = '';
  if (customer) {
    const recentOrders = await customerService.getRecentOrders(customer.id, 3);
    customerContext = `Returning customer: ${customer.full_name || 'unknown name'}, phone: ${customer.phone}`;
    if (customer.loyalty_tier) customerContext += `, tier: ${customer.loyalty_tier}`;
    if (customer.address) customerContext += `, address: ${customer.address}`;
    if (recentOrders.length > 0) {
      customerContext += `. Recent orders: ${recentOrders.map(o => `${o.order_number} (${o.items_summary})`).join('; ')}`;
    }
  } else {
    customerContext = 'New customer, no previous history.';
  }

  const aiResult = await aiRouter.callAI(history, customerContext);
  const elapsed = Date.now() - startTime;

  logger.info(`[${aiResult.provider}] time=${elapsed}ms`);

  await conversationManager.saveMessage(conversation.id, 'bot', aiResult.text, {
    handledBy: aiResult.provider,
    responseTimeMs: elapsed,
  });
  await conversationManager.logRouting(conversation.id, message, aiResult.provider, null, elapsed);
  await conversationManager.updateLastMessage(conversation.id);

  return { text: aiResult.text, images: [], provider: aiResult.provider, conversationId: conversation.id };
}

module.exports = { processMessage };
