-- ========================================
-- VPS Data Fix Script — Run on VPS MySQL
-- ========================================

-- BUG 1: Fix doubled credit balances
-- Recalculate credit_balance from the ledger for ALL customers
UPDATE customers c SET credit_balance = (
  SELECT COALESCE(SUM(credit_delta), 0) FROM customer_ledger WHERE customer_id = c.id
);

-- Remove duplicate credit_issued entries (keep the first one per order)
DELETE cl FROM customer_ledger cl
INNER JOIN (
  SELECT MIN(id) AS keep_id, customer_id, reference_id
  FROM customer_ledger
  WHERE entry_type = 'credit_issued' AND reference_type = 'order'
  GROUP BY customer_id, reference_id
  HAVING COUNT(*) > 1
) dups ON cl.customer_id = dups.customer_id
  AND cl.reference_id = dups.reference_id
  AND cl.entry_type = 'credit_issued'
  AND cl.reference_type = 'order'
  AND cl.id != dups.keep_id;

-- After removing duplicates, recalculate again
UPDATE customers c SET credit_balance = (
  SELECT COALESCE(SUM(credit_delta), 0) FROM customer_ledger WHERE customer_id = c.id
);

-- BUG 2: Fix loyalty points (recalculate from ledger)
UPDATE customers c SET loyalty_points_balance = (
  SELECT COALESCE(SUM(points_delta), 0) FROM customer_ledger WHERE customer_id = c.id
);

-- BUG 3: Fix orders incorrectly marked as 'refunded' when only partially returned
UPDATE orders o SET status = 'partially_refunded'
WHERE o.status = 'refunded'
  AND (
    SELECT COALESCE(SUM(r.quantity), 0) FROM order_returns r WHERE r.order_id = o.id
  ) < (
    SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id
  );

-- SCHEMA: Add delivery_status + updated_at to order_deliveries (if missing)
ALTER TABLE order_deliveries ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT NULL AFTER receiver_address;
ALTER TABLE order_deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL AFTER created_at;

-- Fix Fardar tracking URL
UPDATE couriers SET tracking_url_template = 'https://www.google.com/search?q=fardar+express+tracking+{tracking_number}' WHERE code = 'fardar';

-- Verify results
SELECT 'Credit balances recalculated' AS fix;
SELECT id, full_name, phone, credit_balance, loyalty_points_balance
FROM customers WHERE credit_balance != 0 OR loyalty_points_balance != 0;

SELECT 'Orders with corrected status' AS fix;
SELECT id, order_number, status FROM orders WHERE status IN ('refunded', 'partially_refunded');

-- Quotation table: expand status ENUM and add converted_order_id
ALTER TABLE quotations MODIFY COLUMN status ENUM('draft','sent','accepted','rejected','expired','converted','cancelled') NOT NULL DEFAULT 'draft';
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quotations' AND COLUMN_NAME='converted_order_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE quotations ADD COLUMN converted_order_id INT UNSIGNED NULL AFTER status, ADD CONSTRAINT fk_quotation_order FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Clean up product names: trim whitespace, collapse double spaces, normalise en-dash to hyphen
UPDATE products SET name = TRIM(REGEXP_REPLACE(REPLACE(name, '–', '-'), '[[:space:]]+', ' ')) WHERE name REGEXP '(^\\s|\\s$|\\s{2,}|–)';
UPDATE product_variants SET variant_label = TRIM(REGEXP_REPLACE(REPLACE(variant_label, '–', '-'), '[[:space:]]+', ' ')) WHERE variant_label REGEXP '(^\\s|\\s$|\\s{2,}|–)';

-- WhatsApp notification settings columns (skip if already exist)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_settings' AND COLUMN_NAME='wa_notify_confirmed');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE store_settings ADD COLUMN wa_notify_confirmed TINYINT(1) NOT NULL DEFAULT 1, ADD COLUMN wa_notify_shipped TINYINT(1) NOT NULL DEFAULT 1, ADD COLUMN wa_notify_delivered TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
