-- Tournaments table
CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL UNIQUE,
  name text NOT NULL,
  host text NOT NULL,
  start_date date,
  end_date date,
  teams_count int,
  matches_count int,
  created_at timestamptz DEFAULT now()
);

-- Teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Tournament participants (which teams played in which tournament)
CREATE TABLE tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  group_name text,
  final_position int,
  UNIQUE(tournament_id, team_id)
);

-- Stages (Group Stage, Round of 16, Quarter-Finals, etc.)
CREATE TABLE stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" int NOT NULL,
  UNIQUE(tournament_id, name)
);

-- Matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  group_name text,
  match_date date,
  home_team_id uuid NOT NULL REFERENCES teams(id),
  away_team_id uuid NOT NULL REFERENCES teams(id),
  home_score int,
  away_score int,
  home_score_ht int,
  away_score_ht int,
  home_score_et int,
  away_score_et int,
  home_pen_score int,
  away_pen_score int,
  is_extra_time boolean DEFAULT false,
  is_penalties boolean DEFAULT false,
  stadium text,
  city text,
  created_at timestamptz DEFAULT now()
);

-- Group standings (computed from matches)
CREATE TABLE group_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  played int DEFAULT 0,
  won int DEFAULT 0,
  drawn int DEFAULT 0,
  lost int DEFAULT 0,
  goals_for int DEFAULT 0,
  goals_against int DEFAULT 0,
  goal_difference int DEFAULT 0,
  points int DEFAULT 0,
  position int,
  UNIQUE(tournament_id, team_id, group_name)
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;

-- Public read policies (historical data is public)
CREATE POLICY "select_tournaments" ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_tournaments" ON tournaments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (true);

CREATE POLICY "select_tournament_teams" ON tournament_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tournament_teams" ON tournament_teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_tournament_teams" ON tournament_teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_tournament_teams" ON tournament_teams FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_stages" ON stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_stages" ON stages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_stages" ON stages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_stages" ON stages FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_matches" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_matches" ON matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_matches" ON matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "select_group_standings" ON group_standings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_group_standings" ON group_standings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_group_standings" ON group_standings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_group_standings" ON group_standings FOR DELETE TO authenticated USING (true);

-- Index for common queries
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_stage ON matches(stage_id);
CREATE INDEX idx_group_standings_tournament ON group_standings(tournament_id, group_name);
CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
