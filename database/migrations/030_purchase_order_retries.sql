ALTER TABLE purchase_orders ADD COLUMN submission_key VARCHAR(120) NULL UNIQUE, ADD COLUMN submission_hash CHAR(64) NULL;
