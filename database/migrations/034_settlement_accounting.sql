ALTER TABLE courier_remittances ADD business_receipt_date DATE NULL;
ALTER TABLE courier_remittance_lines
 ADD courier_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD other_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD deduction_reason VARCHAR(500) NULL,
 ADD retained_delivery DECIMAL(12,2) NOT NULL DEFAULT 0,
 ADD fifo_cost_total DECIMAL(14,2) NULL;
