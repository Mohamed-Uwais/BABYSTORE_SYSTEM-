-- Add pay_later and cod to payment methods + backfill
ALTER TABLE order_payments MODIFY COLUMN payment_method
  ENUM('cash','card','bank_transfer','store_credit','pay_later','online_gateway','cod') NOT NULL;

-- Backfill: rows where store_credit was actually "pay later" (credit_delta positive = debt created)
UPDATE order_payments op
  JOIN customer_ledger cl ON cl.reference_id = op.order_id
    AND cl.reference_type = 'order'
    AND cl.entry_type = 'credit_issued'
    AND cl.credit_delta > 0
SET op.payment_method = 'pay_later'
WHERE op.payment_method = 'store_credit';
