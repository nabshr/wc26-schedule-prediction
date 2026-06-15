-- Cron jobs for automated WC2026 fixture sync
-- Anon key is embedded directly (it's a public key, safe to include in cron SQL)

-- 1) Fixture sync: every 30 minutes
--    Fetches full fixture list from API-Football, upserts into wc2026_fixtures
SELECT cron.schedule(
  'sync-wc2026-fixtures',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nxugreemrxtuyjttfdif.supabase.co/functions/v1/sync-fixtures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWdyZWVtcnh0dXlqdHRmZGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzQxOTcsImV4cCI6MjA5NjkxMDE5N30.5TU68ZEYwkrJfm7gDq7MXYWipjXRkNwMmiZYMS1z9Nc'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2) Live match sync: every 30 seconds
--    Fetches only live/in-progress matches (lighter payload)
SELECT cron.schedule(
  'sync-wc2026-live',
  '*/30 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nxugreemrxtuyjttfdif.supabase.co/functions/v1/sync-live',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWdyZWVtcnh0dXlqdHRmZGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzQxOTcsImV4cCI6MjA5NjkxMDE5N30.5TU68ZEYwkrJfm7gDq7MXYWipjXRkNwMmiZYMS1z9Nc'
    ),
    body := '{}'::jsonb
  );
  $$
);
