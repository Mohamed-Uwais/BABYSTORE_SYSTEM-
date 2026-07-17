const { GoogleGenerativeAI } = require('@google/generative-ai');
const { toGeminiFormat } = require('./toolDefinitions');
const toolExecutor = require('./toolExecutor');
const systemPrompt = require('./systemPrompt');
const logger = require('../utils/logger');

let genAI = null;

function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PLACEHOLDER') {
      throw new Error('Gemini API key not configured');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function call(conversationHistory, customerContext) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: toGeminiFormat() }],
  });

  const history = conversationHistory.slice(0, -1).map(msg => ({
    role: msg.sender === 'customer' ? 'user' : 'model',
    parts: [{ text: msg.message_text }],
  }));

  const chat = model.startChat({ history });

  const latestMessage = conversationHistory[conversationHistory.length - 1];
  const userText = customerContext
    ? `[Customer context: ${customerContext}]\n\n${latestMessage.message_text}`
    : latestMessage.message_text;

  let result = await chat.sendMessage(userText);
  let response = result.response;
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 5;

  while (iterations < MAX_TOOL_ITERATIONS) {
    const functionCalls = response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    iterations++;
    logger.debug(`Gemini tool calls (iteration ${iterations}):`, functionCalls.map(fc => fc.name));

    const toolResults = [];
    for (const fc of functionCalls) {
      const toolResult = await toolExecutor.execute(fc.name, fc.args);
      toolResults.push({
        functionResponse: { name: fc.name, response: toolResult },
      });
    }

    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  const text = response.text();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

module.exports = { call };
