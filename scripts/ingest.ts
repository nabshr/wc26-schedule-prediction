// Historical World Cup data ingestion from openfootball/worldcup
// Parses the min/ format files from the GitHub repo
// Outputs SQL INSERT statements for Supabase

interface ParsedTournament {
  year: number;
  name: string;
  host: string;
  teamsCount: number;
  matchesCount: number;
  groups: Map<string, string[]>; // group name -> team names
  stages: { name: string; order: number; matches: ParsedMatch[] }[];
}

interface ParsedMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeScoreET?: number;
  awayScoreET?: number;
  homePenScore?: number;
  awayPenScore?: number;
  isExtraTime: boolean;
  isPenalties: boolean;
  groupName?: string;
  stageName: string;
}

// Tournament host mapping
const HOSTS: Record<number, string> = {
  1930: 'Uruguay', 1934: 'Italy', 1938: 'France', 1950: 'Brazil',
  1954: 'Switzerland', 1958: 'Sweden', 1962: 'Chile', 1966: 'England',
  1970: 'Mexico', 1974: 'West Germany', 1978: 'Argentina', 1982: 'Spain',
  1986: 'Mexico', 1990: 'Italy', 1994: 'USA', 1998: 'France',
  2002: 'South Korea/Japan', 2006: 'Germany', 2010: 'South Africa',
  2014: 'Brazil', 2018: 'Russia', 2022: 'Qatar',
};

function parseMinFormat(text: string): ParsedTournament {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let year = 0;
  let teamsCount = 0;
  let matchesCount = 0;
  const groups = new Map<string, string[]>();
  const stages: { name: string; order: number; matches: ParsedMatch[] }[] = [];
  let currentStageName = '';
  let currentGroupName = '';
  let currentStage: { name: string; order: number; matches: ParsedMatch[] } | null = null;
  let stageOrder = 0;

  for (const line of lines) {
    // Header
    if (line.startsWith('= World Cup')) {
      const m = line.match(/= World Cup (\d{4})/);
      if (m) year = parseInt(m[1]);
      continue;
    }

    // Metadata
    if (line.startsWith('# Teams')) {
      teamsCount = parseInt(line.replace('# Teams', '').trim());
      continue;
    }
    if (line.startsWith('# Matches')) {
      matchesCount = parseInt(line.replace('# Matches', '').trim());
      continue;
    }
    if (line.startsWith('# Dates')) continue;

    // Stage header (▪ )
    if (line.startsWith('▪') && !line.startsWith('▪▪')) {
      const stageName = line.replace(/^▪\s*/, '').trim();
      // Normalize stage names
      currentStageName = normalizeStageName(stageName);
      currentStage = { name: currentStageName, order: stageOrder++, matches: [] };
      stages.push(currentStage);
      currentGroupName = '';
      continue;
    }

    // Group header (▪▪ )
    if (line.startsWith('▪▪')) {
      currentGroupName = line.replace(/^▪▪\s*/, '').trim();
      if (!groups.has(currentGroupName)) {
        groups.set(currentGroupName, []);
      }
      continue;
    }

    // Match line: "Team1 v Team2 Score" or "Team1 v Team2 X-X a.e.t., Y-Y pen."
    const match = parseMatchLine(line, currentStageName, currentGroupName);
    if (match && currentStage) {
      currentStage.matches.push(match);
      // Track teams in groups
      if (currentGroupName) {
        const teamList = groups.get(currentGroupName) || [];
        if (!teamList.includes(match.homeTeam)) teamList.push(match.homeTeam);
        if (!teamList.includes(match.awayTeam)) teamList.push(match.awayTeam);
        groups.set(currentGroupName, teamList);
      }
    }
  }

  return {
    year,
    name: `FIFA World Cup ${year}`,
    host: HOSTS[year] || 'Unknown',
    teamsCount,
    matchesCount,
    groups,
    stages,
  };
}

function normalizeStageName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('first stage') || lower.includes('group matches') || lower === 'group stage') return 'Group Stage';
  if (lower.includes('second round') && !lower.includes('round of 16')) return 'Second Group Stage';
  if (lower.includes('preliminary')) return 'Round of 16';
  if (lower.includes('round of 16')) return 'Round of 16';
  if (lower.includes('quarter-final') || lower.includes('quarterfinal')) return 'Quarter-Finals';
  if (lower.includes('semi-final') || lower.includes('semifinal')) return 'Semi-Finals';
  if (lower.includes('third') || lower.includes('play-off for third') || lower.includes('match for third')) return 'Third Place';
  if (lower.includes('final round') && !lower.includes('quarter') && !lower.includes('semi')) return 'Final Round';
  if (lower === 'final') return 'Final';
  return name;
}

function parseMatchLine(line: string, stageName: string, groupName: string): ParsedMatch | null {
  // Pattern: Team1 v Team2 X-X [a.e.t.] [, Y-Y pen.]
  // Also handles: "X-X a.e.t., Y-Y pen." and "X-X a.e.t."
  const baseMatch = line.match(/^(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)/);
  if (!baseMatch) return null;

  const homeTeam = baseMatch[1].trim();
  const awayTeam = baseMatch[2].trim();
  let homeScore = parseInt(baseMatch[3]);
  let awayScore = parseInt(baseMatch[4]);
  const rest = line.slice(baseMatch[0].length).trim();

  let isExtraTime = false;
  let isPenalties = false;
  let homeScoreET: number | undefined;
  let awayScoreET: number | undefined;
  let homePenScore: number | undefined;
  let awayPenScore: number | undefined;

  // Check for penalties first: "3-3 a.e.t., 4-2 pen."
  const penMatch = rest.match(/(\d+)-(\d+)\s+a\.e\.t\.,\s*(\d+)-(\d+)\s+pen\./);
  if (penMatch) {
    isExtraTime = true;
    isPenalties = true;
    homeScoreET = parseInt(penMatch[1]);
    awayScoreET = parseInt(penMatch[2]);
    homePenScore = parseInt(penMatch[3]);
    awayPenScore = parseInt(penMatch[4]);
    // The main score is the FT-before-ET score
    homeScore = homeScoreET;
    awayScore = awayScoreET;
  }
  // Check for just a.e.t.: "1-1 a.e.t."
  else if (rest.includes('a.e.t.')) {
    const etMatch = rest.match(/(\d+)-(\d+)\s+a\.e\.t\./);
    if (etMatch) {
      isExtraTime = true;
      homeScoreET = parseInt(etMatch[1]);
      awayScoreET = parseInt(etMatch[2]);
      homeScore = homeScoreET;
      awayScore = awayScoreET;
    }
  }

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeScoreET,
    awayScoreET,
    homePenScore,
    awayPenScore,
    isExtraTime,
    isPenalties,
    groupName: groupName || undefined,
    stageName,
  };
}

function computeGroupStandings(matches: ParsedMatch[]): Map<string, {
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number;
}[]> {
  const groupMap = new Map<string, Map<string, {
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number; points: number;
  }>>();

  for (const m of matches) {
    if (!m.groupName) continue;
    if (!groupMap.has(m.groupName)) groupMap.set(m.groupName, new Map());

    const group = groupMap.get(m.groupName)!;

    // Init teams
    for (const team of [m.homeTeam, m.awayTeam]) {
      if (!group.has(team)) {
        group.set(team, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      }
    }

    const home = group.get(m.homeTeam)!;
    const away = group.get(m.awayTeam)!;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points += 1;
      away.drawn++; away.points += 1;
    }
  }

  // Convert to sorted arrays
  const result = new Map<string, {
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number; points: number;
  }[]>();

  for (const [groupName, group] of groupMap) {
    const sorted = Array.from(group.entries())
      .map(([team, stats]) => ({ team, ...stats, goalDifference: stats.goalsFor - stats.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
      .map(({ team, ...stats }) => ({ team, ...stats }));
    result.set(groupName, sorted.map(s => ({
      played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
      goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, points: s.points,
    })));
    // Store team order for position
    result.set(groupName + '__teams', sorted.map(s => s.team)) as any;
  }

  return result;
}

// SQL escape
function esc(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function generateSQL(tournaments: ParsedTournament[]): string {
  const allTeams = new Set<string>();
  for (const t of tournaments) {
    for (const stage of t.stages) {
      for (const m of stage.matches) {
        allTeams.add(m.homeTeam);
        allTeams.add(m.awayTeam);
      }
    }
  }

  const sql: string[] = [];

  // Insert teams
  sql.push('-- Teams');
  for (const team of Array.from(allTeams).sort()) {
    sql.push(`INSERT INTO teams (name) VALUES (${esc(team)}) ON CONFLICT (name) DO NOTHING;`);
  }

  // Insert tournaments
  sql.push('\n-- Tournaments');
  for (const t of tournaments) {
    sql.push(`INSERT INTO tournaments (year, name, host, teams_count, matches_count) VALUES (${esc(t.year)}, ${esc(t.name)}, ${esc(t.host)}, ${esc(t.teamsCount)}, ${esc(t.matchesCount)}) ON CONFLICT (year) DO UPDATE SET name=EXCLUDED.name, host=EXCLUDED.host, teams_count=EXCLUDED.teams_count, matches_count=EXCLUDED.matches_count;`);
  }

  // Insert stages, tournament_teams, matches, group_standings per tournament
  for (const t of tournaments) {
    sql.push(`\n-- Tournament ${t.year}`);
    sql.push(`DO $$ DECLARE t_id uuid; BEGIN SELECT id INTO t_id FROM tournaments WHERE year = ${t.year};`);

    // Stages
    for (const stage of t.stages) {
      sql.push(`INSERT INTO stages (tournament_id, name, "order") VALUES (t_id, ${esc(stage.name)}, ${esc(stage.order)}) ON CONFLICT (tournament_id, name) DO UPDATE SET "order"=EXCLUDED."order";`);
    }

    // Tournament teams with groups
    for (const [groupName, teams] of t.groups) {
      for (const team of teams) {
        sql.push(`INSERT INTO tournament_teams (tournament_id, team_id, group_name) VALUES (t_id, (SELECT id FROM teams WHERE name = ${esc(team)}), ${esc(groupName)}) ON CONFLICT (tournament_id, team_id) DO UPDATE SET group_name=EXCLUDED.group_name;`);
      }
    }
    // Also add knockout-only teams that aren't in groups
    const groupTeams = new Set<string>();
    for (const [, teams] of t.groups) {
      for (const team of teams) groupTeams.add(team);
    }
    for (const stage of t.stages) {
      for (const m of stage.matches) {
        if (!groupTeams.has(m.homeTeam)) {
          sql.push(`INSERT INTO tournament_teams (tournament_id, team_id) VALUES (t_id, (SELECT id FROM teams WHERE name = ${esc(m.homeTeam)})) ON CONFLICT (tournament_id, team_id) DO NOTHING;`);
          groupTeams.add(m.homeTeam);
        }
        if (!groupTeams.has(m.awayTeam)) {
          sql.push(`INSERT INTO tournament_teams (tournament_id, team_id) VALUES (t_id, (SELECT id FROM teams WHERE name = ${esc(m.awayTeam)})) ON CONFLICT (tournament_id, team_id) DO NOTHING;`);
          groupTeams.add(m.awayTeam);
        }
      }
    }

    // Delete old matches/standings for this tournament
    sql.push(`DELETE FROM matches WHERE tournament_id = t_id;`);
    sql.push(`DELETE FROM group_standings WHERE tournament_id = t_id;`);

    // Matches
    for (const stage of t.stages) {
      for (const m of stage.matches) {
        sql.push(`INSERT INTO matches (tournament_id, stage_id, group_name, home_team_id, away_team_id, home_score, away_score, home_score_et, away_score_et, home_pen_score, away_pen_score, is_extra_time, is_penalties) VALUES (t_id, (SELECT id FROM stages WHERE tournament_id = t_id AND name = ${esc(stage.name)}), ${esc(m.groupName)}, (SELECT id FROM teams WHERE name = ${esc(m.homeTeam)}), (SELECT id FROM teams WHERE name = ${esc(m.awayTeam)}), ${esc(m.homeScore)}, ${esc(m.awayScore)}, ${esc(m.homeScoreET)}, ${esc(m.awayScoreET)}, ${esc(m.homePenScore)}, ${esc(m.awayPenScore)}, ${esc(m.isExtraTime)}, ${esc(m.isPenalties)});`);
      }
    }

    // Group standings (computed)
    const groupMatches = t.stages
      .filter(s => s.name === 'Group Stage' || s.name === 'First Group Stage' || s.name === 'Second Group Stage')
      .flatMap(s => s.matches)
      .filter(m => m.groupName);

    const standings = computeGroupStandings(groupMatches);
    for (const [key, entries] of standings) {
      if (key.endsWith('__teams')) continue;
      const teamNames = (standings as any).get(key + '__teams') as string[] || [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const teamName = teamNames[i];
        if (!teamName) continue;
        sql.push(`INSERT INTO group_standings (tournament_id, team_id, group_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position) VALUES (t_id, (SELECT id FROM teams WHERE name = ${esc(teamName)}), ${esc(key)}, ${esc(e.played)}, ${esc(e.won)}, ${esc(e.drawn)}, ${esc(e.lost)}, ${esc(e.goalsFor)}, ${esc(e.goalsAgainst)}, ${esc(e.goalsFor - e.goalsAgainst)}, ${esc(e.points)}, ${esc(i + 1)});`);
      }
    }

    sql.push('END $$;');
  }

  return sql.join('\n');
}

// Main: fetch all min/ files from GitHub and generate SQL
async function main() {
  const years = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022];
  const tournaments: ParsedTournament[] = [];

  for (const year of years) {
    try {
      const url = `https://raw.githubusercontent.com/openfootball/worldcup/master/min/${year}.txt`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`Failed to fetch ${year}: ${resp.status}`);
        continue;
      }
      const text = await resp.text();
      const parsed = parseMinFormat(text);
      tournaments.push(parsed);
      console.log(`Parsed ${year}: ${parsed.stages.reduce((a, s) => a + s.matches.length, 0)} matches, ${parsed.groups.size} groups`);
    } catch (err) {
      console.error(`Error fetching ${year}:`, err);
    }
  }

  // Write SQL to stdout
  const sql = generateSQL(tournaments);
  console.log('\n--- SQL OUTPUT ---');
  console.log(sql);
}

main();
