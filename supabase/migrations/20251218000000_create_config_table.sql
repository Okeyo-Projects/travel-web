-- 20251218000000_create_config_table.sql

-- Create the config table
CREATE TABLE public.config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the table and columns
COMMENT ON TABLE public.config IS 'A key-value store for application-wide configuration settings.';
COMMENT ON COLUMN public.config.key IS 'The unique key for the configuration setting (e.g., ''service_fee_percentage'').';
COMMENT ON COLUMN public.config.value IS 'The value of the configuration setting, stored as JSONB to support various data types.';
COMMENT ON COLUMN public.config.description IS 'A human-readable description of what the configuration setting is for.';

-- Enable Row Level Security
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER trg_config_updated_at
  BEFORE UPDATE ON public.config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create RLS policies
CREATE POLICY "Allow public read access"
ON public.config
FOR SELECT
USING (true);

CREATE POLICY "Allow admin write access"
ON public.config
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');


-- Seed initial configuration values
INSERT INTO public.config (key, value, description)
VALUES
  ('service_fee_percentage', '{"value": 0.05}', 'The service fee percentage charged to customers on each booking.'),
  ('vat_percentage', '{"value": 0.08}', 'The Value Added Tax (VAT) percentage applied to bookings.'),
  ('default_currency', '{"value": "MAD"}', 'The default currency used throughout the application (ISO 4217 code).'),
  ('min_booking_nights', '{"value": 1}', 'The global minimum number of nights required for a lodging booking.'),
  ('max_booking_nights', '{"value": 30}', 'The global maximum number of nights allowed for a lodging booking.'),
  ('support_email', '{"value": "support@okeyo.com"}', 'The primary email address for customer support inquiries.'),
  ('support_phone', '{"value": "+212 6 00 00 00 00"}', 'The primary phone number for customer support.'),
  ('company_address', '{"value": "123 Okeyo Street, Casablanca, Morocco"}', 'The physical address of the company headquarters.');

