-- Some installations already have these two columns from the manual settlement upgrade.
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_deliveries' AND column_name='settled'),'SELECT 1','ALTER TABLE order_deliveries ADD settled BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_deliveries' AND column_name='settled_at'),'SELECT 1','ALTER TABLE order_deliveries ADD settled_at TIMESTAMP NULL');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
CREATE TABLE courier_remittances (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 courier_id INT UNSIGNED NOT NULL, amount DECIMAL(12,2) NOT NULL,
 method VARCHAR(20) NOT NULL, receiving_account VARCHAR(100) NOT NULL, notes VARCHAR(500) NULL,
 staff_id INT UNSIGNED NOT NULL, request_key VARCHAR(100) NOT NULL UNIQUE, payload_hash CHAR(64) NOT NULL,
 received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(courier_id) REFERENCES couriers(id),FOREIGN KEY(staff_id) REFERENCES users(id)
);
CREATE TABLE courier_remittance_lines (
 remittance_id INT UNSIGNED NOT NULL, delivery_id INT UNSIGNED NOT NULL,
 expected_amount DECIMAL(12,2) NOT NULL, amount DECIMAL(12,2) NOT NULL,
 PRIMARY KEY(remittance_id,delivery_id), FOREIGN KEY(remittance_id) REFERENCES courier_remittances(id),
 FOREIGN KEY(delivery_id) REFERENCES order_deliveries(id)
);
-- Baseline installations have only the two original customer types.
SET @ddl = IF((SELECT column_type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='customers' AND column_name='customer_type') = 'enum(''walk_in'',''loyalty'')','ALTER TABLE customers MODIFY customer_type ENUM(''walk_in'',''loyalty'',''courier'') NOT NULL DEFAULT ''walk_in''','SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
