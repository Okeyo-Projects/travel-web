-- Add store URLs to config table

INSERT INTO public.config (key, value, description)
VALUES
  ('ios_store_url', '{"value": "https://apps.apple.com/app/id123456789"}', 'The App Store URL for the iOS app.'),
  ('android_store_url', '{"value": "https://play.google.com/store/apps/details?id=com.okeyo.experience"}', 'The Google Play Store URL for the Android app.')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
