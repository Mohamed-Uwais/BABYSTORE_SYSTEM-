const cron = require('node-cron');
const conversationManager = require('./conversationManager');
const logger = require('../utils/logger');

const TWO_HOUR_NUDGES = [
  "Hey! 👋 Just checking — were you still interested in what we were chatting about?",
  "Hi! No rush, just wanted to make sure you got all the info 😊",
  "Still thinking about it? Happy to help if you have questions!",
];

const TWENTY_FOUR_HOUR_NUDGES = [
  "Hey again! 🙂 The products you asked about are still in stock!",
  "Hi! Quick reminder — we can deliver today if you order now!",
  "Just a friendly follow-up! 😊 Let me know if you'd like to order.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function runRecovery(sendFn) {
  try {
    const { twoHour, twentyFourHour } = await conversationManager.getGhostCandidates();

    for (const conv of twoHour) {
      const nudge = pick(TWO_HOUR_NUDGES);
      await conversationManager.saveMessage(conv.id, 'bot', nudge, { handledBy: 'pattern_matcher', intent: 'ghost_nudge' });
      await conversationManager.recordNudge(conv.id);
      if (sendFn) await sendFn(conv, nudge);
      logger.info(`Ghost nudge (2h) sent to conversation ${conv.id}`);
    }

    for (const conv of twentyFourHour) {
      const nudge = pick(TWENTY_FOUR_HOUR_NUDGES);
      await conversationManager.saveMessage(conv.id, 'bot', nudge, { handledBy: 'pattern_matcher', intent: 'ghost_nudge' });
      await conversationManager.recordNudge(conv.id);
      await conversationManager.closeConversation(conv.id);
      if (sendFn) await sendFn(conv, nudge);
      logger.info(`Ghost nudge (24h) + close for conversation ${conv.id}`);
    }
  } catch (err) {
    logger.error('Ghost recovery error:', err.message);
  }
}

function start(sendFn) {
  cron.schedule('*/5 * * * *', () => runRecovery(sendFn));
  logger.info('Ghost recovery cron started (every 5 minutes)');
}

module.exports = { start, runRecovery };
