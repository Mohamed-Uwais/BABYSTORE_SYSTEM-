CREATE TABLE purchase_receipt_charges (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,purchase_order_id INT UNSIGNED NOT NULL,
 description VARCHAR(160) NOT NULL,payee VARCHAR(160) NOT NULL,amount DECIMAL(12,2) NOT NULL,
 allocation JSON NOT NULL,created_by INT UNSIGNED NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id)
);
CREATE TABLE purchase_payments (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,purchase_order_id INT UNSIGNED NOT NULL,
 charge_id INT UNSIGNED NULL,amount DECIMAL(12,2) NOT NULL,method VARCHAR(20) NOT NULL,
 account VARCHAR(100) NOT NULL,paid_by INT UNSIGNED NOT NULL,operator_id INT UNSIGNED NOT NULL,
 request_key VARCHAR(80) NOT NULL UNIQUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(charge_id) REFERENCES purchase_receipt_charges(id),FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id)
);
CREATE TABLE purchase_invoices (
 purchase_order_id INT UNSIGNED PRIMARY KEY,mime VARCHAR(32) NOT NULL,content MEDIUMBLOB NOT NULL,
 uploaded_by INT UNSIGNED NOT NULL,uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id)
);
ALTER TABLE purchase_orders ADD COLUMN finance_tracked TINYINT NOT NULL DEFAULT 0;
