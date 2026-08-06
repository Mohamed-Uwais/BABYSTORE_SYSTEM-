-- Optional credit limit per customer
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT NULL AFTER credit_balance;
