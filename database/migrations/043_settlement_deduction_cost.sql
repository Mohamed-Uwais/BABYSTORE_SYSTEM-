-- Preserve unknown historical allocations; new settlement facts capture this at posting.
ALTER TABLE courier_remittance_lines ADD COLUMN recognized_deduction_cost DECIMAL(16,2) NULL;
