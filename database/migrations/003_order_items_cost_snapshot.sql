-- Snapshot cost_price at time of sale for accurate profit reporting
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cost_price_snapshot DECIMAL(10,2) DEFAULT NULL AFTER line_total;
