CREATE TABLE credit_receipts (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 customer_id INT UNSIGNED NOT NULL, order_id INT UNSIGNED NOT NULL,
 amount DECIMAL(12,2) NOT NULL, method VARCHAR(20) NOT NULL,
 receiving_account VARCHAR(100) NOT NULL, business_receipt_date DATE NOT NULL,
 staff_id INT UNSIGNED NOT NULL, notes VARCHAR(255) NULL,
 request_key VARCHAR(100) NOT NULL UNIQUE,payload_hash CHAR(64) NOT NULL,
 merchandise_amount DECIMAL(12,2) NOT NULL,merchandise_total DECIMAL(12,2) NOT NULL,
 fifo_cost_total DECIMAL(14,2) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES customers(id),FOREIGN KEY(order_id) REFERENCES orders(id)
);
