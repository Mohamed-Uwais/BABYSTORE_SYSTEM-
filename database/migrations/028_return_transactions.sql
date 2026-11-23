CREATE TABLE return_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_key VARCHAR(128) NOT NULL UNIQUE,
  payload_hash CHAR(64) NOT NULL,
  original_order_id INT UNSIGNED NOT NULL,
  replacement_order_id INT UNSIGNED NULL UNIQUE,
  approved_amount DECIMAL(12,2) NULL, applied_amount DECIMAL(12,2) NULL,
  residual_method VARCHAR(24) NULL, residual_amount DECIMAL(12,2) NULL,
  processed_by INT UNSIGNED NOT NULL, result JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(original_order_id) REFERENCES orders(id),
  FOREIGN KEY(replacement_order_id) REFERENCES orders(id)
);
