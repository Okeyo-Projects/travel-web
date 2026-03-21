-- Add guest mode and delete account flags to config table

INSERT INTO public.config (key, value, description)
VALUES
  ('guest_mode', '{"value": true}', 'Enable anonymous/guest access in the auth screen.'),
  ('delete_account_enabled', '{"value": true}', 'Enable the "Delete account" action in settings.')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;







