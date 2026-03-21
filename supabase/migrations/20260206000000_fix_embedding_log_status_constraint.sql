-- Ensure embedding_generation_logs supports all statuses written by triggers/functions.
-- Previous migration inserts 'pending' on publish, but the check constraint omitted it.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('public.embedding_generation_logs') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'embedding_generation_logs'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.embedding_generation_logs DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.embedding_generation_logs
ADD CONSTRAINT embedding_generation_logs_status_check
CHECK (status IN ('pending', 'running', 'completed', 'failed'));
