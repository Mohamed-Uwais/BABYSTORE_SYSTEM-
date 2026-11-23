ALTER TABLE order_payments ADD COLUMN cash_tendered DECIMAL(10,2) NULL;
ALTER TABLE orders ADD COLUMN receipt_coupon_code VARCHAR(100) NULL, ADD COLUMN receipt_coupon_amount DECIMAL(10,2) NULL;
