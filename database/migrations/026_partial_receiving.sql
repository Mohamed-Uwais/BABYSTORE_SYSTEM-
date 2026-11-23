ALTER TABLE stock_batches
  ADD COLUMN purchase_order_item_id INT UNSIGNED NULL,
  ADD INDEX idx_receipt_line (purchase_order_item_id),
  ADD CONSTRAINT fk_stock_batch_po_item FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id);
