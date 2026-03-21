-- Add review_delay_ms to config table

INSERT INTO public.config (key, value, description)
VALUES
  ('review_delay_ms', '{"value": 120000}', 'Delay in milliseconds before prompting for store review after login (default: 2 minutes).')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
