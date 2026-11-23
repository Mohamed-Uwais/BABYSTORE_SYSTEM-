CREATE TABLE credit_receipt_reversals (
 receipt_id INT UNSIGNED PRIMARY KEY,
 reason VARCHAR(500) NOT NULL,staff_id INT UNSIGNED NOT NULL,
 business_date DATE NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(receipt_id) REFERENCES credit_receipts(id),FOREIGN KEY(staff_id) REFERENCES users(id)
);
