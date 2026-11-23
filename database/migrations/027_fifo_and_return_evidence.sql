CREATE TABLE sale_batch_allocations (
  order_item_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  returned_qty INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (order_item_id,batch_id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (batch_id) REFERENCES stock_batches(id)
);
ALTER TABLE order_items ADD COLUMN fifo_cost_total DECIMAL(16,2) NULL,
  ADD COLUMN refund_paid_amount DECIMAL(12,2) NULL;
ALTER TABLE order_returns ADD COLUMN fifo_cost_total DECIMAL(16,2) NULL;
CREATE TABLE refund_allocation_reviews (
  order_id INT UNSIGNED PRIMARY KEY, approved_by INT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL, amounts JSON NOT NULL,
  approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(approved_by) REFERENCES users(id)
);
ALTER TABLE order_items ADD COLUMN discount_allocation JSON NULL;
