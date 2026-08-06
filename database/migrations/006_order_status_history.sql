-- Track order status changes for audit trail
CREATE TABLE IF NOT EXISTS order_status_history (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    INT UNSIGNED NOT NULL,
    status      VARCHAR(50) NOT NULL,
    changed_by  INT UNSIGNED DEFAULT NULL,
    notes       VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
