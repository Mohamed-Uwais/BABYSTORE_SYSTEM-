-- Durable replay protection. Apply before deploying the Phase 1 API.
-- Existing orders and clients are unchanged; no historical backfill is needed.
CREATE TABLE IF NOT EXISTS checkout_requests (
  request_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  payload_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  order_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
