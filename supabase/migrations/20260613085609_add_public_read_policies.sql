-- Allow public (anon) read access for frontend display
CREATE POLICY "select_tournaments_public" ON tournaments FOR SELECT TO anon USING (true);
CREATE POLICY "select_teams_public" ON teams FOR SELECT TO anon USING (true);
CREATE POLICY "select_stages_public" ON stages FOR SELECT TO anon USING (true);
CREATE POLICY "select_matches_public" ON matches FOR SELECT TO anon USING (true);
CREATE POLICY "select_group_standings_public" ON group_standings FOR SELECT TO anon USING (true);
CREATE POLICY "select_tournament_teams_public" ON tournament_teams FOR SELECT TO anon USING (true);
