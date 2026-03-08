-- Add host_fees_percentage to config table

INSERT INTO public.config (key, value, description)
VALUES
  ('host_fees_percentage', '{"value": 0.05}', 'The host fee percentage added to the price when hosts create experiences (default: 5%).')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
