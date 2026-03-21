-- Add Payzone specific fields to payments table
ALTER TABLE payments
ADD COLUMN payzone_charge_id TEXT,
ADD COLUMN payzone_internal_id TEXT,
ADD COLUMN payzone_raw_notification JSONB;

-- Ensure we have indices for lookups
CREATE INDEX idx_payments_payzone_charge_id ON payments(payzone_charge_id);
