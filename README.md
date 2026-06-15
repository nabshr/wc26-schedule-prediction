# wc26-schedule-prediction

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-xs8ou7ew)

FIFA World Cup 2026 prediction and analytics dashboard.

## Live Match Sync

The app uses **API-Football** (api-sports.io) as the single source of truth for live fixture data, operating within the **free plan limit of 100 requests/day**. Two Supabase Edge Functions handle syncing:

- **`sync-fixtures`** — Fetches the full fixture list (all matches, all statuses). Runs every **60 minutes** via pg_cron (24 requests/day).
- **`sync-live`** — Fetches only live/in-progress matches. Runs every **5 minutes** via pg_cron, but **only during match windows** (when a match is live or about to kick off within 2.5 hours). Skipped entirely when idle.

Both functions enforce a **daily API budget of 90 calls** (leaving 10 for manual triggers). If the budget is exhausted, syncs return `rate_limited` and skip the API call. Upserts are idempotent on `provider_fixture_id` and group standings are recomputed for completed matches. Sync runs are logged in `sync_runs` with status, error count, and timestamps.

### Required Secrets

Set `API_FOOTBALL_KEY` as a Supabase Edge Function secret:

```
supabase secrets set API_FOOTBALL_KEY=your_api_football_key
```

Without this key, sync functions will return an error on invocation.

### Manual Sync

Use the **Admin** page in the app to manually trigger fixture or live syncs. Alternatively, call the edge functions directly:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-fixtures \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"

curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-live \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"
```

### Cron Jobs

Configured via `pg_cron` + `pg_net` in the Supabase database:

| Job | Schedule | Function |
|---|---|---|
| `sync-wc2026-fixtures` | Every 60 min | `sync-fixtures` |
| `sync-wc2026-live` | Every 5 min (skipped when idle) | `sync-live` |

### Data Flow

1. Static fixtures from `src/data/fixtures2026.ts` serve as the baseline
2. Supabase-synced data from `wc2026_fixtures` overrides static data where available
3. The `useWC2026Fixtures` hook merges both sources, preferring synced data
4. Extra fixtures (e.g., newly scheduled knockouts) not in static data are included

### Provider Config

The `provider_config` table stores the active provider settings. Current defaults:

- Provider: `api-football`
- Base URL: `https://v3.football.api-sports.io`
- Competition ID: `1` (FIFA World Cup)
- Season: `2026`
