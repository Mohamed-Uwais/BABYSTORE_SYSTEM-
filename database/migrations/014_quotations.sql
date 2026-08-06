-- Quotation generator
CREATE TABLE IF NOT EXISTS quotations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id     INT UNSIGNED DEFAULT NULL,
    pricing_mode    ENUM('retail','wholesale') NOT NULL DEFAULT 'retail',
    items           JSON NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
    grand_total     DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    status          ENUM('draft','sent','accepted','expired','converted') NOT NULL DEFAULT 'draft',
    valid_until     DATE DEFAULT NULL,
    converted_order_id INT UNSIGNED DEFAULT NULL,
    created_by      INT UNSIGNED DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
