-- WC2026 Sync Tables
-- Stores synced fixtures/results from API-Football, sync run logs, and provider config

-- Provider configuration (API key name stored, not the key itself)
CREATE TABLE provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'api-football',
  base_url text NOT NULL DEFAULT 'https://v3.football.api-sports.io',
  competition_id int, -- API-Football league ID for World Cup 2026
  season int DEFAULT 2026,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Synced WC2026 fixtures and results
CREATE TABLE wc2026_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_fixture_id int, -- API-Football fixture ID
  match_number int, -- our internal match number
  stage text NOT NULL, -- 'group', 'r32', 'r16', 'qf', 'sf', 'third', 'final'
  group_name text, -- A-L for group stage, null for knockout
  matchday int DEFAULT 0,
  kickoff_utc timestamptz,
  venue text,
  city text,
  home_team_code text NOT NULL, -- canonical team code (MEX, BRA, etc.)
  away_team_code text NOT NULL, -- canonical team code
  home_score int,
  away_score int,
  match_status text NOT NULL DEFAULT 'scheduled', -- scheduled, live, completed, postponed
  status_detail text, -- e.g. '1H', 'HT', '2H', 'FT', 'AET', 'PEN'
  match_minute int, -- current minute for live matches
  winner_code text, -- 'home', 'away', 'draw', null if not finished
  last_synced_at timestamptz DEFAULT now(),
  raw_payload jsonb, -- raw API response for debugging
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_fixture_id),
  UNIQUE(match_number)
);

-- Sync run logs
CREATE TABLE sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL, -- 'fixtures', 'live', 'results'
  provider_name text NOT NULL DEFAULT 'api-football',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- running, success, error, partial
  fixtures_fetched int DEFAULT 0,
  fixtures_inserted int DEFAULT 0,
  fixtures_updated int DEFAULT 0,
  error_count int DEFAULT 0,
  last_error text,
  is_live_match boolean DEFAULT false, -- whether any match was live during this run
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Computed group standings for WC2026 (recomputed after each sync)
CREATE TABLE wc2026_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  team_code text NOT NULL,
  played int DEFAULT 0,
  won int DEFAULT 0,
  drawn int DEFAULT 0,
  lost int DEFAULT 0,
  goals_for int DEFAULT 0,
  goals_against int DEFAULT 0,
  goal_difference int DEFAULT 0,
  points int DEFAULT 0,
  position int,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(group_name, team_code)
);

-- Enable RLS
ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc2026_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc2026_standings ENABLE ROW LEVEL SECURITY;

-- Public read + authenticated write policies
CREATE POLICY "select_provider_config" ON provider_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_provider_config" ON provider_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_provider_config" ON provider_config FOR UPDATE TO authenticated USING (true);

CREATE POLICY "select_wc2026_fixtures" ON wc2026_fixtures FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_wc2026_fixtures" ON wc2026_fixtures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_wc2026_fixtures" ON wc2026_fixtures FOR UPDATE TO authenticated USING (true);

CREATE POLICY "select_sync_runs" ON sync_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_sync_runs" ON sync_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_sync_runs" ON sync_runs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "select_wc2026_standings" ON wc2026_standings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_wc2026_standings" ON wc2026_standings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_wc2026_standings" ON wc2026_standings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_wc2026_standings" ON wc2026_standings FOR DELETE TO authenticated USING (true);

-- Indexes for common queries
CREATE INDEX idx_wc2026_fixtures_status ON wc2026_fixtures(match_status);
CREATE INDEX idx_wc2026_fixtures_kickoff ON wc2026_fixtures(kickoff_utc);
CREATE INDEX idx_wc2026_fixtures_group ON wc2026_fixtures(group_name) WHERE group_name IS NOT NULL;
CREATE INDEX idx_wc2026_fixtures_home ON wc2026_fixtures(home_team_code);
CREATE INDEX idx_wc2026_fixtures_away ON wc2026_fixtures(away_team_code);
CREATE INDEX idx_sync_runs_type ON sync_runs(sync_type, started_at DESC);
CREATE INDEX idx_wc2026_standings_group ON wc2026_standings(group_name, position);

-- Also allow anon read (public fixture data)
CREATE POLICY "anon_select_wc2026_fixtures" ON wc2026_fixtures FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_wc2026_standings" ON wc2026_standings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_sync_runs" ON sync_runs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_provider_config" ON provider_config FOR SELECT TO anon USING (true);
