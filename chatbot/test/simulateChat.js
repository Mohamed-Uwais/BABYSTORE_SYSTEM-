const readline = require('readline');
const axios = require('axios');

const BASE_URL = process.env.CHATBOT_URL || 'http://localhost:5002';
const PHONE = process.env.SIM_PHONE || '94771234567';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function color(code, text) { return `\x1b[${code}m${text}\x1b[0m`; }
const cyan = (t) => color(36, t);
const green = (t) => color(32, t);
const yellow = (t) => color(33, t);
const dim = (t) => color(2, t);
const bold = (t) => color(1, t);

console.log(bold('\n╔══════════════════════════════════════════╗'));
console.log(bold('║   🤖 Liya Chatbot Simulator              ║'));
console.log(bold('║   Type a message to chat with Liya        ║'));
console.log(bold('║   Type "quit" or "exit" to stop           ║'));
console.log(bold('╚══════════════════════════════════════════╝\n'));

function prompt() {
  rl.question(cyan('You: '), async (input) => {
    const text = input.trim();
    if (!text) return prompt();
    if (text === 'quit' || text === 'exit') {
      console.log(dim('\nBye! 👋\n'));
      rl.close();
      process.exit(0);
    }

    try {
      const start = Date.now();
      const res = await axios.post(`${BASE_URL}/api/simulate`, {
        message: text,
        phone: PHONE,
      });
      const elapsed = Date.now() - start;
      const { reply, provider, responseTime } = res.data;

      const providerBadge = provider === 'pattern_matcher'
        ? yellow('[Pattern Matcher]')
        : provider === 'gemini'
          ? color(35, '[Gemini]')
          : provider === 'claude'
            ? color(34, '[Claude]')
            : dim('[Fallback]');

      console.log(`${green('Liya:')} ${reply}`);
      console.log(dim(`   ${providerBadge} ${responseTime}ms (network: ${elapsed}ms)\n`));
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      console.log(color(31, `Error: ${msg}\n`));
    }

    prompt();
  });
}

prompt();
