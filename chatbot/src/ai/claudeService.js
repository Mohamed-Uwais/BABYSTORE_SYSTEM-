const Anthropic = require('@anthropic-ai/sdk');
const { toAnthropicFormat } = require('./toolDefinitions');
const toolExecutor = require('./toolExecutor');
const systemPrompt = require('./systemPrompt');
const logger = require('../utils/logger');

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('PLACEHOLDER')) {
      throw new Error('Anthropic API key not configured');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function call(conversationHistory, customerContext) {
  const anthropic = getClient();
  const tools = toAnthropicFormat();

  const messages = conversationHistory.map(msg => ({
    role: msg.sender === 'customer' ? 'user' : 'assistant',
    content: msg.message_text,
  }));

  if (customerContext && messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content = `[Customer context: ${customerContext}]\n\n${messages[messages.length - 1].content}`;
  }

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 5;

  while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');
    logger.debug(`Claude tool calls (iteration ${iterations}):`, toolBlocks.map(b => b.name));

    const toolResults = [];
    for (const block of toolBlocks) {
      const result = await toolExecutor.execute(block.name, block.input);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textBlocks = response.content.filter(b => b.type === 'text');
  const text = textBlocks.map(b => b.text).join('\n');
  if (!text) throw new Error('Empty response from Claude');
  return text;
}

module.exports = { call };
