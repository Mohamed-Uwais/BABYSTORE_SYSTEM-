const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL || 'info'] ?? 2;

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

module.exports = {
  error: (...args) => currentLevel >= 0 && console.error(`[${ts()}] ❌`, ...args),
  warn:  (...args) => currentLevel >= 1 && console.warn(`[${ts()}] ⚠️`, ...args),
  info:  (...args) => currentLevel >= 2 && console.log(`[${ts()}] ℹ️`, ...args),
  debug: (...args) => currentLevel >= 3 && console.log(`[${ts()}] 🔍`, ...args),
};
