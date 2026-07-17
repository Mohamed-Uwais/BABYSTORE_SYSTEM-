const db = require('../config/db');
const logger = require('../utils/logger');

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chatbot_conversations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      channel ENUM('whatsapp','instagram','messenger','simulator','web') NOT NULL,
      channel_user_id VARCHAR(100),
      customer_id INT UNSIGNED,
      status ENUM('active','paused','closed') DEFAULT 'active',
      owner_takeover TINYINT(1) DEFAULT 0,
      ghost_nudge_count TINYINT DEFAULT 0,
      ghost_nudge_sent_at TIMESTAMP NULL,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_channel_user (channel, channel_user_id),
      INDEX idx_status (status),
      INDEX idx_last_msg (last_message_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chatbot_messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT UNSIGNED NOT NULL,
      sender ENUM('customer','bot','owner') NOT NULL,
      message_text TEXT,
      message_type VARCHAR(20) DEFAULT 'text',
      handled_by ENUM('pattern_matcher','gemini','claude','fallback','owner') DEFAULT NULL,
      intent VARCHAR(50) DEFAULT NULL,
      response_time_ms INT UNSIGNED DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_conv (conversation_id),
      FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS message_routing_log (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT UNSIGNED NOT NULL,
      message_text TEXT,
      handled_by ENUM('pattern_matcher','gemini','claude','fallback') NOT NULL,
      intent VARCHAR(50),
      response_time_ms INT UNSIGNED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  logger.info('Chatbot tables ready');
}

async function getOrCreate(channel, senderInfo) {
  const userId = senderInfo.channelUserId || senderInfo.phone;
  const [rows] = await db.query(
    `SELECT * FROM chatbot_conversations WHERE channel = ? AND channel_user_id = ? AND status != 'closed' ORDER BY id DESC LIMIT 1`,
    [channel, userId]
  );
  if (rows.length > 0) return rows[0];

  const [result] = await db.query(
    `INSERT INTO chatbot_conversations (channel, channel_user_id, customer_id) VALUES (?, ?, ?)`,
    [channel, userId, senderInfo.customerId || null]
  );
  return { id: result.insertId, channel, channel_user_id: userId, customer_id: senderInfo.customerId || null, status: 'active', owner_takeover: 0, ghost_nudge_count: 0 };
}

async function saveMessage(conversationId, sender, text, meta = {}) {
  const [result] = await db.query(
    `INSERT INTO chatbot_messages (conversation_id, sender, message_text, message_type, handled_by, intent, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversationId, sender, text, meta.messageType || 'text', meta.handledBy || null, meta.intent || null, meta.responseTimeMs || null]
  );
  return result.insertId;
}

async function logRouting(conversationId, messageText, handledBy, intent, responseTimeMs) {
  await db.query(
    `INSERT INTO message_routing_log (conversation_id, message_text, handled_by, intent, response_time_ms) VALUES (?, ?, ?, ?, ?)`,
    [conversationId, messageText, handledBy, intent, responseTimeMs]
  );
}

async function getHistory(conversationId, limit = 20) {
  const [rows] = await db.query(
    `SELECT sender, message_text, created_at FROM chatbot_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?`,
    [conversationId, limit]
  );
  return rows.reverse();
}

async function updateLastMessage(conversationId) {
  await db.query(`UPDATE chatbot_conversations SET last_message_at = NOW() WHERE id = ?`, [conversationId]);
}

async function setTakeover(conversationId, takeover) {
  await db.query(`UPDATE chatbot_conversations SET owner_takeover = ? WHERE id = ?`, [takeover ? 1 : 0, conversationId]);
}

async function closeConversation(conversationId) {
  await db.query(`UPDATE chatbot_conversations SET status = 'closed' WHERE id = ?`, [conversationId]);
}

async function getActiveConversations() {
  const [rows] = await db.query(`
    SELECT c.*,
      (SELECT message_text FROM chatbot_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT sender FROM chatbot_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_sender,
      (SELECT COUNT(*) FROM chatbot_messages WHERE conversation_id = c.id) AS message_count
    FROM chatbot_conversations c
    WHERE c.status != 'closed'
    ORDER BY c.last_message_at DESC
  `);
  return rows;
}

async function getConversationById(id) {
  const [rows] = await db.query(`SELECT * FROM chatbot_conversations WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function getGhostCandidates() {
  const [twoHour] = await db.query(`
    SELECT * FROM chatbot_conversations
    WHERE status = 'active' AND owner_takeover = 0
      AND last_message_at < NOW() - INTERVAL 2 HOUR
      AND ghost_nudge_count = 0
  `);
  const [twentyFourHour] = await db.query(`
    SELECT * FROM chatbot_conversations
    WHERE status = 'active' AND owner_takeover = 0
      AND last_message_at < NOW() - INTERVAL 24 HOUR
      AND ghost_nudge_count = 1
  `);
  return { twoHour, twentyFourHour };
}

async function recordNudge(conversationId) {
  await db.query(
    `UPDATE chatbot_conversations SET ghost_nudge_count = ghost_nudge_count + 1, ghost_nudge_sent_at = NOW(), last_message_at = NOW() WHERE id = ?`,
    [conversationId]
  );
}

module.exports = {
  ensureTables, getOrCreate, saveMessage, logRouting, getHistory,
  updateLastMessage, setTakeover, closeConversation,
  getActiveConversations, getConversationById,
  getGhostCandidates, recordNudge,
};
