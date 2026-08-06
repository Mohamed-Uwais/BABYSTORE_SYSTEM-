-- Payment slip upload for bank transfer / online orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_slip_url VARCHAR(500) DEFAULT NULL AFTER notes;
