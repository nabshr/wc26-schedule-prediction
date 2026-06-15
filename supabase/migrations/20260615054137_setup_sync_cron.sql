-- Cron jobs for automated WC2026 fixture sync
-- Uses pg_net.http_post to invoke Supabase Edge Functions on schedule

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
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
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
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
