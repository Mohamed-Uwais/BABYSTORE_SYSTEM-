ALTER TABLE purchase_orders
  ADD COLUMN invoice_reference VARCHAR(100) NULL,
  ADD COLUMN invoice_date DATE NULL,
  ADD INDEX purchase_supplier_invoice (supplier_id,invoice_reference);
CREATE TABLE purchase_payment_reversals (
  payment_id INT UNSIGNED PRIMARY KEY,
  reason VARCHAR(500) NOT NULL,
  reversed_by INT UNSIGNED NOT NULL,
  reversed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES purchase_payments(id),
  FOREIGN KEY (reversed_by) REFERENCES users(id)
);
