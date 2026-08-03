const { GoogleGenerativeAI } = require('@google/generative-ai');
const { toGeminiFormat } = require('./toolDefinitions');
const toolExecutor = require('./toolExecutor');
const systemPrompt = require('./systemPrompt');
const logger = require('../utils/logger');

let genAI = null;

function getClient() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'PLACEHOLDER') {
      throw new Error('Gemini API key not configured');
    }
    logger.info(`Gemini: initializing with key ${key.substring(0, 8)}... model=${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function buildGeminiHistory(messages) {
  let history = messages.map(m => ({
    role: m.sender === 'customer' ? 'user' : 'model',
    parts: [{ text: m.message_text || '' }],
  })).filter(m => m.parts[0].text.trim() !== '');

  // Gemini requires history to START with a user turn
  while (history.length && history[0].role !== 'user') history.shift();

  // Gemini requires strict alternation — collapse consecutive same-role turns
  const clean = [];
  for (const turn of history) {
    if (clean.length && clean[clean.length - 1].role === turn.role) {
      clean[clean.length - 1].parts[0].text += '\n' + turn.parts[0].text;
    } else {
      clean.push(turn);
    }
  }

  // Final turn must be user (we send the new message next)
  if (clean.length && clean[clean.length - 1].role === 'model') clean.pop();

  return clean;
}

async function callWithRetry(fn, maxRetries = 2) {
  let lastErr;
  const delays = [1000, 3000];
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const is503 = err.message?.includes('503') || err.status === 503;
      if (!is503 || i === maxRetries) throw err;
      logger.warn(`Gemini 503 — retrying in ${delays[i]}ms (attempt ${i + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw lastErr;
}

async function call(conversationHistory, customerContext) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: toGeminiFormat() }],
  });

  const history = buildGeminiHistory(conversationHistory.slice(0, -1));

  const chat = model.startChat({ history });

  const latestMessage = conversationHistory[conversationHistory.length - 1];
  const userText = customerContext
    ? `[Customer context: ${customerContext}]\n\n${latestMessage.message_text}`
    : latestMessage.message_text;

  let result = await callWithRetry(() => chat.sendMessage(userText));
  let response = result.response;
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 5;
  const collectedImages = [];
  const knownProducts = new Set();

  while (iterations < MAX_TOOL_ITERATIONS) {
    const functionCalls = response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    iterations++;
    logger.debug(`Gemini tool calls (iteration ${iterations}):`, functionCalls.map(fc => fc.name));

    const toolResults = [];
    for (const fc of functionCalls) {
      const toolResult = await toolExecutor.execute(fc.name, fc.args);
      if (fc.name === 'search_products' && toolResult.products) {
        for (const p of toolResult.products) {
          knownProducts.add(p.name.toLowerCase());
          if (p.variant) knownProducts.add(`${p.name} ${p.variant}`.toLowerCase());
          if (p.brand) knownProducts.add(p.brand.toLowerCase());
          if (p.image_url && collectedImages.length < 3) {
            collectedImages.push({ url: p.image_url, caption: `${p.name} — Rs. ${Number(p.discounted_price || p.price).toLocaleString()}` });
          }
        }
      }
      if (fc.name === 'check_stock' && toolResult.name) {
        knownProducts.add(toolResult.name.toLowerCase());
      }
      toolResults.push({
        functionResponse: { name: fc.name, response: toolResult },
      });
    }

    result = await callWithRetry(() => chat.sendMessage(toolResults));
    response = result.response;
  }

  const text = response.text();
  if (!text) throw new Error('Empty response from Gemini');
  return { text, images: collectedImages, knownProducts };
}

module.exports = { call };
