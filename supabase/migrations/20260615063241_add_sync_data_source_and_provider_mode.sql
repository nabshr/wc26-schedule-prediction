-- Add data_source tracking to wc2026_fixtures
ALTER TABLE wc2026_fixtures ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'api-football';
ALTER TABLE wc2026_fixtures ADD COLUMN IF NOT EXISTS is_manual_override boolean DEFAULT false;

-- Add provider_mode to provider_config (primary_only, fallback_on_failure, backup_only)
ALTER TABLE provider_config ADD COLUMN IF NOT EXISTS provider_mode text DEFAULT 'fallback_on_failure';

-- Add metadata fields to sync_runs for provider diagnostics
ALTER TABLE sync_runs ALTER COLUMN metadata TYPE jsonb USING metadata::jsonb;
COMMENT ON COLUMN sync_runs.metadata IS 'Provider request metadata: http_status, rate_limit headers, request_url, etc.';
