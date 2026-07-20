-- Fix credit_balance sign convention:
-- Old system: negative = customer owes money (wallet model)
-- New system: positive = customer owes money (credit tab model)
-- Run this ONCE to flip any negative balances to positive.

-- Add credit_limit column (ignore error if already exists)
ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT NULL AFTER credit_balance;

-- Flip negative credit_balance to positive (old wallet model → credit tab model)
UPDATE customers SET credit_balance = ABS(credit_balance) WHERE credit_balance < 0;

-- Flip customer_ledger credit_delta signs for old entries
-- Old: credit_issued had negative delta (gave credit to spend), credit_repaid had positive delta (used credit)
-- New: credit_issued has positive delta (customer owes more), credit_repaid has negative delta (customer paid back)
-- Only flip entries that have the WRONG sign for their type:
UPDATE customer_ledger SET credit_delta = -credit_delta
WHERE (entry_type = 'credit_issued' AND credit_delta < 0)
   OR (entry_type = 'credit_repaid' AND credit_delta > 0);
