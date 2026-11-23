CREATE TABLE inventory_adjustments (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 variant_id INT UNSIGNED NOT NULL,
 submission_key VARCHAR(100) NOT NULL UNIQUE,
 request_hash CHAR(64) NOT NULL,
 change_qty INT NOT NULL,
 previous_stock INT NOT NULL,
 resulting_stock INT NOT NULL,
 reason VARCHAR(500) NOT NULL,
 batch_allocations JSON NOT NULL,
 created_by INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (variant_id) REFERENCES product_variants(id),
 FOREIGN KEY (created_by) REFERENCES users(id)
);
