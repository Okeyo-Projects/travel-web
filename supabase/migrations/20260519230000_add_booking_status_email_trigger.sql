-- Migration: Add database trigger to send emails when host accepts/rejects a booking
-- This requires the pg_net extension to be enabled for HTTP calls from Postgres
--
-- The trigger fires AFTER UPDATE on bookings.status and calls the
-- send-booking-response-email edge function via HTTP POST.
--
-- Benefits:
--   - Works for web, mobile, and admin without any client changes
--   - Catches ALL status changes, even direct DB updates
--   - Fail-safe: errors are logged but don't block the booking update

-- ─── Enable pg_net extension (if not already enabled) ───
-- Note: This requires pg_net to be available in your Supabase project.
-- If pg_net is not available, use the alternative trigger below that
-- stores pending emails in a queue table instead.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
END $$;

-- ─── Create the trigger function ───
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  edge_function_url TEXT;
  payload JSONB;
  response_status INT;
BEGIN
  -- Only act on status changes to approved or declined
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'declined') THEN
    RETURN NEW;
  END IF;

  -- Get edge function URL from project config
  -- The edge function URL follows the pattern:
  -- https://<project-ref>.supabase.co/functions/v1/send-booking-response-email
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'http://kong:8000'
  );

  edge_function_url := supabase_url || '/functions/v1/send-booking-response-email';

  -- Build payload
  payload := jsonb_build_object(
    'booking_id', NEW.id,
    'new_status', NEW.status,
    'guest_id', NEW.guest_id,
    'host_id', NEW.host_id
  );

  -- Call edge function via pg_net (async, non-blocking)
  -- If pg_net is not available, this will fail gracefully
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
      ),
      body := payload
    );

    RAISE LOG '[booking_status_trigger] Email queued for booking %, status %', NEW.id, NEW.status;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but never block the transaction
      RAISE WARNING '[booking_status_trigger] Failed to queue email for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ─── Attach trigger ───
DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;

CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_status_change();

-- ─── Add comment for documentation ───
COMMENT ON FUNCTION public.handle_booking_status_change() IS
  'Sends transactional emails via Brevo when a host accepts or declines a booking. '
  'Called automatically by trigger on bookings table. Fail-safe: errors do not block the booking update.';

-- ─── Alternative: Queue-based approach (if pg_net is unavailable) ───
-- If pg_net extension is not available in your Supabase project,
-- uncomment the following and comment out the pg_net approach above.
-- A cron job or background worker can then process the queue.

/*
-- Create pending emails queue table
CREATE TABLE IF NOT EXISTS public.pending_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  user_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only" ON public.pending_emails
  FOR ALL USING (auth.role() = 'service_role');

-- Modify the trigger function to insert into queue instead:
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'declined') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pending_emails (template, to_email, data, entity_type, entity_id)
  VALUES (
    CASE WHEN NEW.status = 'approved' THEN 'booking_approved' ELSE 'booking_declined' END,
    (SELECT email FROM public.profiles WHERE id = NEW.guest_id),
    jsonb_build_object(
      'booking_id', NEW.id,
      'new_status', NEW.status,
      'guest_id', NEW.guest_id,
      'host_id', NEW.host_id
    ),
    'booking',
    NEW.id
  );

  RETURN NEW;
END;
$$;
*/
