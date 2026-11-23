-- Do not backfill historical recognition with guessed allocations.
ALTER TABLE credit_receipts ADD COLUMN recognized_fifo_cost DECIMAL(16,2) NULL;
ALTER TABLE courier_remittance_lines ADD COLUMN recognized_fifo_cost DECIMAL(16,2) NULL;
