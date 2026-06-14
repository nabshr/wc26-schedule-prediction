import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Tournament {
  id: number;
  year: number;
  host: string;
  winner_id: number | null;
}

export interface Team {
  id: number;
  name: string;
  code: string | null;
}

export interface Stage {
  id: number;
  tournament_id: number;
  name: string;
  order: number;
}

export interface Match {
  id: number;
  tournament_id: number;
  stage_id: number;
  group_name: string | null;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  home_score_et: number | null;
  away_score_et: number | null;
  home_pen_score: number | null;
  away_pen_score: number | null;
  is_extra_time: boolean;
  is_penalties: boolean;
  home_team?: Team;
  away_team?: Team;
  stage?: Stage;
}

export interface GroupStanding {
  id: number;
  tournament_id: number;
  team_id: number;
  group_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
  team?: Team;
}

export interface TournamentTeam {
  tournament_id: number;
  team_id: number;
  group_name: string | null;
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTournamentByYear(year: number): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('year', year)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchStages(tournamentId: number): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchMatches(tournamentId: number, stageId?: number): Promise<Match[]> {
  let query = supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), stage:stages(*)')
    .eq('tournament_id', tournamentId)
    .order('id', { ascending: true });
  if (stageId) {
    query = query.eq('stage_id', stageId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchGroupStandings(tournamentId: number, groupName?: string): Promise<GroupStanding[]> {
  let query = supabase
    .from('group_standings')
    .select('*, team:teams(*)')
    .eq('tournament_id', tournamentId)
    .order('position', { ascending: true });
  if (groupName) {
    query = query.eq('group_name', groupName);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchTournamentTeams(tournamentId: number): Promise<TournamentTeam[]> {
  const { data, error } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('tournament_id', tournamentId);
  if (error) throw error;
  return data || [];
}
