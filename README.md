# wc26-schedule-prediction

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-xs8ou7ew)

FIFA World Cup 2026 prediction and analytics dashboard.

## Live Match Sync

The app uses **API-Football** (api-sports.io) as the primary source for fixture data, with **football-data.org** as a backup, operating within the **free plan limit of 100 requests/day**.

### Edge Functions

- **`sync-fixtures`** — Fetches full fixture list from API-Football. Runs every **60 minutes** via pg_cron (24 requests/day). Falls back to football-data.org if primary fails.
- **`sync-live`** — Fetches only live/in-progress matches. Runs every **5 minutes** via pg_cron, but **only during match windows** (match live or kickoff within 2.5 hours). Skipped entirely when idle.
- **`admin-override`** — Manual score overrides, standings recomputation, and provider mode changes.

Both sync functions enforce a **daily API budget of 90 calls**. If the budget is exhausted, syncs return `rate_limited`. Upserts are idempotent on `provider_fixture_id`. Group standings are recomputed for completed matches. Sync runs log provider metadata (HTTP status, rate-limit headers, request URL) in `sync_runs.metadata`.

### Provider Modes

Configurable via `provider_config.provider_mode`:

| Mode | Behavior |
|---|---|
| `primary_only` | Only API-Football. No fallback. |
| `fallback_on_failure` (default) | API-Football primary. Falls back to football-data.org on errors/empty responses. |
| `backup_only` | Only football-data.org. No API-Football calls. |

Change mode in Admin UI or via `admin-override` edge function.

### Data Integrity Rules

- Idempotent upserts only — no duplicates
- Never blank out scores because a provider field is missing
- Backup data never overwrites existing primary data
- Manual overrides are marked `data_source=manual`, `is_manual_override=true`
- Primary provider completed results can overwrite manual overrides
- Unmapped team names are skipped and logged in `sync_runs.metadata`
- Standings recomputed only when fixture data changes

### Required Secrets

| Secret | Purpose |
|---|---|
| `API_FOOTBALL_KEY` | Primary provider auth (api-sports.io) |
| `FOOTBALL_DATA_ORG_KEY` | Backup provider auth (football-data.org) — optional |

```
supabase secrets set API_FOOTBALL_KEY=your_key
supabase secrets set FOOTBALL_DATA_ORG_KEY=your_key
```

### Manual Sync & Overrides

Use the **Admin** page or call edge functions directly:

```bash
# Full fixture sync
curl -X POST https://<project>/functions/v1/sync-fixtures \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json"

# Live sync
curl -X POST https://<project>/functions/v1/sync-live \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json"

# Manual score override
curl -X POST https://<project>/functions/v1/admin-override \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"action":"override_score","home_team_code":"BRA","away_team_code":"ARG","kickoff_utc":"2026-06-15T18:00:00Z","home_score":2,"away_score":1}'

# Recompute standings
curl -X POST https://<project>/functions/v1/admin-override \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"action":"recompute_standings"}'
```

### Cron Jobs

| Job | Schedule | Function |
|---|---|---|
| `sync-wc2026-fixtures` | Every 60 min | `sync-fixtures` |
| `sync-wc2026-live` | Every 5 min (skipped when idle) | `sync-live` |

### Data Flow

1. Static fixtures from `src/data/fixtures2026.ts` serve as the baseline
2. Supabase-synced data from `wc2026_fixtures` overrides static data where available
3. The `useWC2026Fixtures` hook merges both sources, preferring synced data
4. Extra fixtures (e.g., newly scheduled knockouts) not in static data are included
5. Each fixture records `data_source` (api-football, football-data.org, or manual)

### Provider Config

The `provider_config` table stores active settings:

- Provider: `api-football`
- Base URL: `https://v3.football.api-sports.io`
- Competition ID: `1` (FIFA World Cup)
- Season: `2026`
- Provider Mode: `fallback_on_failure`

### Troubleshooting

If sync returns `fixtures_fetched: 0`:
1. Check `sync_runs.metadata` in Admin — shows HTTP status, API message, rate-limit remaining
2. Verify `API_FOOTBALL_KEY` is set: `supabase secrets list`
3. Check if competition/season is correct in `provider_config`
4. If primary consistently returns 0, switch to `backup_only` mode and set `FOOTBALL_DATA_ORG_KEY`
5. Use manual override for individual match scores
