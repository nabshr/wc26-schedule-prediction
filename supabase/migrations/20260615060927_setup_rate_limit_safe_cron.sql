-- Rate-limit-safe cron jobs for API-Football free plan (100 requests/day)
-- Fixture sync: every 60 minutes (24 requests/day)
-- Live sync: every 5 minutes during match windows, otherwise skipped by edge function logic
-- Total worst case: 24 (fixtures) + 72 (live, if all 12h have matches) = 96 < 100

SELECT cron.schedule(
  'sync-wc2026-fixtures',
  '0 * * * *',
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

SELECT cron.schedule(
  'sync-wc2026-live',
  '*/5 * * * *',
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
