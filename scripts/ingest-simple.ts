// Generate simplified SQL for inserting matches and standings
// Uses CTEs to resolve IDs instead of subqueries inside loops
// Run: npx tsx scripts/ingest-simple.ts > /tmp/wc_simple.sql

interface ParsedTournament {
  year: number;
  groups: Map<string, string[]>;
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

const HOSTS: Record<number, string> = {
  1930: 'Uruguay', 1934: 'Italy', 1938: 'France', 1950: 'Brazil',
  1954: 'Switzerland', 1958: 'Sweden', 1962: 'Chile', 1966: 'England',
  1970: 'Mexico', 1974: 'West Germany', 1978: 'Argentina', 1982: 'Spain',
  1986: 'Mexico', 1990: 'Italy', 1994: 'USA', 1998: 'France',
  2002: 'South Korea/Japan', 2006: 'Germany', 2010: 'South Africa',
  2014: 'Brazil', 2018: 'Russia', 2022: 'Qatar',
};

function esc(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function parseMinFormat(text: string): ParsedTournament {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let year = 0;
  const groups = new Map<string, string[]>();
  const stages: { name: string; order: number; matches: ParsedMatch[] }[] = [];
  let currentStageName = '';
  let currentGroupName = '';
  let currentStage: { name: string; order: number; matches: ParsedMatch[] } | null = null;
  let stageOrder = 0;

  for (const line of lines) {
    if (line.startsWith('= World Cup')) {
      const m = line.match(/= World Cup (\d{4})/);
      if (m) year = parseInt(m[1]);
      continue;
    }
    if (line.startsWith('#')) continue;

    if (line.startsWith('▪') && !line.startsWith('▪▪')) {
      const stageName = line.replace(/^▪\s*/, '').trim();
      currentStageName = normalizeStageName(stageName);
      currentStage = { name: currentStageName, order: stageOrder++, matches: [] };
      stages.push(currentStage);
      currentGroupName = '';
      continue;
    }

    if (line.startsWith('▪▪')) {
      currentGroupName = line.replace(/^▪▪\s*/, '').trim();
      if (!groups.has(currentGroupName)) groups.set(currentGroupName, []);
      continue;
    }

    const match = parseMatchLine(line, currentStageName, currentGroupName);
    if (match && currentStage) {
      currentStage.matches.push(match);
      if (currentGroupName) {
        const teamList = groups.get(currentGroupName) || [];
        if (!teamList.includes(match.homeTeam)) teamList.push(match.homeTeam);
        if (!teamList.includes(match.awayTeam)) teamList.push(match.awayTeam);
        groups.set(currentGroupName, teamList);
      }
    }
  }

  return { year, groups, stages };
}

function normalizeStageName(name: string): string {
  const lower = name.toLowerCase();
  const isReplay = lower.includes('replay');
  if (lower.includes('first stage') || lower.includes('group matches') || lower === 'group stage') return 'Group Stage';
  if (lower.includes('second round') && !lower.includes('round of 16')) return 'Second Group Stage';
  if (lower.includes('preliminary')) return 'Round of 16';
  if (lower.includes('round of 16')) return 'Round of 16' + (isReplay ? ' Replay' : '');
  if (lower.includes('1st round') || lower.includes('first round')) return 'Round of 16' + (isReplay ? ' Replay' : '');
  if (lower.includes('quarter-final') || lower.includes('quarterfinal')) return 'Quarter-Finals' + (isReplay ? ' Replay' : '');
  if (lower.includes('semi-final') || lower.includes('semifinal')) return 'Semi-Finals';
  if (lower.includes('third') || lower.includes('play-off for third') || lower.includes('match for third')) return 'Third Place';
  if (lower.includes('final round') && !lower.includes('quarter') && !lower.includes('semi')) return 'Final Round';
  if (lower === 'final') return 'Final';
  return name;
}

function parseMatchLine(line: string, stageName: string, groupName: string): ParsedMatch | null {
  const baseMatch = line.match(/^(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)/);
  if (!baseMatch) return null;

  const homeTeam = baseMatch[1].trim();
  const awayTeam = baseMatch[2].trim();
  let homeScore = parseInt(baseMatch[3]);
  let awayScore = parseInt(baseMatch[4]);
  const rest = line.slice(baseMatch[0].length).trim();

  let isExtraTime = false, isPenalties = false;
  let homeScoreET: number | undefined, awayScoreET: number | undefined;
  let homePenScore: number | undefined, awayPenScore: number | undefined;

  const penMatch = rest.match(/(\d+)-(\d+)\s+a\.e\.t\.,\s*(\d+)-(\d+)\s+pen\./);
  if (penMatch) {
    isExtraTime = true; isPenalties = true;
    homeScoreET = parseInt(penMatch[1]); awayScoreET = parseInt(penMatch[2]);
    homePenScore = parseInt(penMatch[3]); awayPenScore = parseInt(penMatch[4]);
    homeScore = homeScoreET; awayScore = awayScoreET;
  } else if (rest.includes('a.e.t.')) {
    const etMatch = rest.match(/(\d+)-(\d+)\s+a\.e\.t\./);
    if (etMatch) {
      isExtraTime = true;
      homeScoreET = parseInt(etMatch[1]); awayScoreET = parseInt(etMatch[2]);
      homeScore = homeScoreET; awayScore = awayScoreET;
    }
  }

  return { homeTeam, awayTeam, homeScore, awayScore, homeScoreET, awayScoreET, homePenScore, awayPenScore, isExtraTime, isPenalties, groupName: groupName || undefined, stageName };
}

function computeGroupStandings(matches: ParsedMatch[]): { team: string; groupName: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; position: number }[] {
  const groupMap = new Map<string, Map<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>>();

  for (const m of matches) {
    if (!m.groupName) continue;
    if (!groupMap.has(m.groupName)) groupMap.set(m.groupName, new Map());
    const group = groupMap.get(m.groupName)!;
    for (const team of [m.homeTeam, m.awayTeam]) {
      if (!group.has(team)) group.set(team, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    }
    const home = group.get(m.homeTeam)!;
    const away = group.get(m.awayTeam)!;
    home.played++; away.played++;
    home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) { home.won++; home.points += 3; away.lost++; }
    else if (m.homeScore < m.awayScore) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; home.points++; away.drawn++; away.points++; }
  }

  const result: { team: string; groupName: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; position: number }[] = [];
  for (const [groupName, group] of groupMap) {
    const sorted = Array.from(group.entries())
      .map(([team, s]) => ({ team, groupName, ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    sorted.forEach((entry, i) => result.push({ ...entry, position: i + 1 }));
  }
  return result;
}

async function main() {
  const years = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022];
  const tournaments: ParsedTournament[] = [];
  const allTeams = new Set<string>();

  for (const year of years) {
    const url = `https://raw.githubusercontent.com/openfootball/worldcup/master/min/${year}.txt`;
    const resp = await fetch(url);
    if (!resp.ok) { console.error(`Failed ${year}: ${resp.status}`); continue; }
    const text = await resp.text();
    const parsed = parseMinFormat(text);
    tournaments.push(parsed);
    for (const stage of parsed.stages) {
      for (const m of stage.matches) { allTeams.add(m.homeTeam); allTeams.add(m.awayTeam); }
    }
    console.error(`Parsed ${year}: ${parsed.stages.reduce((a, s) => a + s.matches.length, 0)} matches, ${parsed.groups.size} groups`);
  }

  // Generate SQL using temporary ID mapping tables approach
  const sql: string[] = [];

  for (const t of tournaments) {
    const tid = `t_${t.year}`;
    sql.push(`\n-- Tournament ${t.year}`);

    // Get tournament ID
    sql.push(`DELETE FROM matches WHERE tournament_id = (SELECT id FROM tournaments WHERE year = ${t.year});`);
    sql.push(`DELETE FROM group_standings WHERE tournament_id = (SELECT id FROM tournaments WHERE year = ${t.year});`);
    sql.push(`DELETE FROM tournament_teams WHERE tournament_id = (SELECT id FROM tournaments WHERE year = ${t.year});`);
    sql.push(`DELETE FROM stages WHERE tournament_id = (SELECT id FROM tournaments WHERE year = ${t.year});`);

    // Stages
    for (const stage of t.stages) {
      sql.push(`INSERT INTO stages (tournament_id, name, "order") VALUES ((SELECT id FROM tournaments WHERE year = ${t.year}), ${esc(stage.name)}, ${esc(stage.order)});`);
    }

    // Tournament teams
    const groupTeams = new Set<string>();
    for (const [groupName, teams] of t.groups) {
      for (const team of teams) {
        sql.push(`INSERT INTO tournament_teams (tournament_id, team_id, group_name) VALUES ((SELECT id FROM tournaments WHERE year = ${t.year}), (SELECT id FROM teams WHERE name = ${esc(team)}), ${esc(groupName)}) ON CONFLICT (tournament_id, team_id) DO UPDATE SET group_name=EXCLUDED.group_name;`);
        groupTeams.add(team);
      }
    }
    // Knockout-only teams
    for (const stage of t.stages) {
      for (const m of stage.matches) {
        for (const team of [m.homeTeam, m.awayTeam]) {
          if (!groupTeams.has(team)) {
            sql.push(`INSERT INTO tournament_teams (tournament_id, team_id) VALUES ((SELECT id FROM tournaments WHERE year = ${t.year}), (SELECT id FROM teams WHERE name = ${esc(team)})) ON CONFLICT (tournament_id, team_id) DO NOTHING;`);
            groupTeams.add(team);
          }
        }
      }
    }

    // Matches
    for (const stage of t.stages) {
      for (const m of stage.matches) {
        sql.push(`INSERT INTO matches (tournament_id, stage_id, group_name, home_team_id, away_team_id, home_score, away_score, home_score_et, away_score_et, home_pen_score, away_pen_score, is_extra_time, is_penalties) VALUES ((SELECT id FROM tournaments WHERE year = ${t.year}), (SELECT id FROM stages WHERE tournament_id = (SELECT id FROM tournaments WHERE year = ${t.year}) AND name = ${esc(stage.name)}), ${esc(m.groupName)}, (SELECT id FROM teams WHERE name = ${esc(m.homeTeam)}), (SELECT id FROM teams WHERE name = ${esc(m.awayTeam)}), ${esc(m.homeScore)}, ${esc(m.awayScore)}, ${esc(m.homeScoreET)}, ${esc(m.awayScoreET)}, ${esc(m.homePenScore)}, ${esc(m.awayPenScore)}, ${esc(m.isExtraTime)}, ${esc(m.isPenalties)});`);
      }
    }

    // Group standings
    const groupMatches = t.stages
      .filter(s => s.name === 'Group Stage' || s.name === 'First Group Stage' || s.name === 'Second Group Stage')
      .flatMap(s => s.matches)
      .filter(m => m.groupName);
    const standings = computeGroupStandings(groupMatches);
    for (const s of standings) {
      sql.push(`INSERT INTO group_standings (tournament_id, team_id, group_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position) VALUES ((SELECT id FROM tournaments WHERE year = ${t.year}), (SELECT id FROM teams WHERE name = ${esc(s.team)}), ${esc(s.groupName)}, ${esc(s.played)}, ${esc(s.won)}, ${esc(s.drawn)}, ${esc(s.lost)}, ${esc(s.goalsFor)}, ${esc(s.goalsAgainst)}, ${esc(s.goalDifference)}, ${esc(s.points)}, ${esc(s.position)});`);
    }
  }

  console.log(sql.join('\n'));
}

main();
