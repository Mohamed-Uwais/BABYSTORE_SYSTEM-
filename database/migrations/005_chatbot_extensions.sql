-- Extended chatbot fields for owner takeover, nudge counting, message routing
ALTER TABLE chatbot_conversations
  ADD COLUMN IF NOT EXISTS owner_takeover TINYINT(1) DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS ghost_nudge_count TINYINT DEFAULT 0 AFTER owner_takeover;

ALTER TABLE chatbot_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text' AFTER message_text,
  ADD COLUMN IF NOT EXISTS handled_by ENUM('pattern_matcher','gemini','claude','fallback','owner') DEFAULT NULL AFTER message_type,
  ADD COLUMN IF NOT EXISTS intent VARCHAR(50) DEFAULT NULL AFTER handled_by,
  ADD COLUMN IF NOT EXISTS response_time_ms INT UNSIGNED DEFAULT NULL AFTER intent,
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL AFTER response_time_ms;

-- Message routing log for analytics
CREATE TABLE IF NOT EXISTS message_routing_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    message_text    TEXT,
    handled_by      ENUM('pattern_matcher','gemini','claude','fallback') NOT NULL,
    intent          VARCHAR(50) DEFAULT NULL,
    response_time_ms INT UNSIGNED DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
