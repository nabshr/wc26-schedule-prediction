import { WC2026Team, getTeamsByGroup, GROUP_NAMES } from '../data/worldCup2026';

// ── Elo → Win Probability ──────────────────────────────────────────────
export function eloWinProb(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// ── Poisson PMF ────────────────────────────────────────────────────────
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = k * Math.log(lambda) - lambda;
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// ── Elo → Expected Goals ───────────────────────────────────────────────
const BASE_GOALS = 1.35;
const ELO_GOAL_SCALE = 0.0018;
const HOME_ADV_FACTOR = 1.08; // ~8% home advantage

function expectedGoals(eloTeam: number, eloOpponent: number): number {
  const diff = eloTeam - eloOpponent;
  return Math.max(0.3, BASE_GOALS + diff * ELO_GOAL_SCALE);
}

// ── Dixon-Coles Adjustment ──────────────────────────────────────────────
const DC_RHO = 0.13;

function dixonColesAdj(homeGoals: number, awayGoals: number, homeLambda: number, awayLambda: number): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 + DC_RHO * homeLambda * awayLambda;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + DC_RHO * awayLambda;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + DC_RHO * homeLambda;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - DC_RHO;
  }
  return 1;
}

// ── Venue Context ───────────────────────────────────────────────────────
export type VenueContext = 'neutral' | 'home';

// ── Match Prediction ───────────────────────────────────────────────────
export interface MatchPrediction {
  teamAWinProb: number;
  drawProb: number;
  teamBWinProb: number;
  expectedTeamAGoals: number;
  expectedTeamBGoals: number;
  scorelines: ScorelineProb[];
  bttsProb: number;
  over25Prob: number;
  over15Prob: number;
  over35Prob: number;
  venue: VenueContext;
}

export interface ScorelineProb {
  teamA: number;
  teamB: number;
  prob: number;
}

export function predictMatch(teamA: WC2026Team, teamB: WC2026Team, venue: VenueContext = 'neutral'): MatchPrediction {
  // In neutral venue, both teams use baseline expected goals (no home advantage)
  // In "home" context, teamA is treated as the home side with +8% goal boost
  const teamALambda = venue === 'home'
    ? expectedGoals(teamA.elo, teamB.elo) * HOME_ADV_FACTOR
    : expectedGoals(teamA.elo, teamB.elo);
  const teamBLambda = venue === 'home'
    ? expectedGoals(teamB.elo, teamA.elo)
    : expectedGoals(teamB.elo, teamA.elo);

  const MAX_GOALS = 7;
  let teamAWinProb = 0;
  let drawProb = 0;
  let teamBWinProb = 0;
  let bttsProb = 0;
  let over25Prob = 0;
  let over15Prob = 0;
  let over35Prob = 0;

  const scorelines: ScorelineProb[] = [];

  for (let a = 0; a <= MAX_GOALS; a++) {
    for (let b = 0; b <= MAX_GOALS; b++) {
      const rawA = poissonPmf(a, teamALambda);
      const rawB = poissonPmf(b, teamBLambda);
      const rawProb = rawA * rawB;
      const adj = dixonColesAdj(a, b, teamALambda, teamBLambda);
      const prob = rawProb * adj;

      scorelines.push({ teamA: a, teamB: b, prob });

      if (a > b) teamAWinProb += prob;
      else if (a === b) drawProb += prob;
      else teamBWinProb += prob;

      if (a > 0 && b > 0) bttsProb += prob;
      if (a + b > 1.5) over15Prob += prob;
      if (a + b > 2.5) over25Prob += prob;
      if (a + b > 3.5) over35Prob += prob;
    }
  }

  // Normalize W/D/L to sum to 1
  const total = teamAWinProb + drawProb + teamBWinProb;
  teamAWinProb /= total;
  drawProb /= total;
  teamBWinProb /= total;

  // Sort scorelines by probability descending
  scorelines.sort((a, b) => b.prob - a.prob);

  return {
    teamAWinProb: teamAWinProb * 100,
    drawProb: drawProb * 100,
    teamBWinProb: teamBWinProb * 100,
    expectedTeamAGoals: teamALambda,
    expectedTeamBGoals: teamBLambda,
    scorelines,
    bttsProb: bttsProb * 100,
    over25Prob: over25Prob * 100,
    over15Prob: over15Prob * 100,
    over35Prob: over35Prob * 100,
    venue,
  };
}

// ── Scoreline Matrix (for heatmap) ─────────────────────────────────────
export function buildScorelineMatrix(prediction: MatchPrediction, size: number = 6): number[][] {
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (const s of prediction.scorelines) {
    if (s.teamA < size && s.teamB < size) {
      matrix[s.teamA][s.teamB] = s.prob * 100;
    }
  }
  return matrix;
}

// ── Monte Carlo: Group Stage Simulation ─────────────────────────────────
export interface GroupProbabilities {
  team: WC2026Team;
  p1st: number;
  p2nd: number;
  p3rd: number;
  p4th: number;
  pAdvance: number;
}

export interface SimulationResult {
  groups: Record<string, GroupProbabilities[]>;
  simulationRuns: number;
  modelVersion: string;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poissonRandom(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

interface SimGroupStanding {
  team: WC2026Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function compareStandings(a: SimGroupStanding, b: SimGroupStanding): number {
  if (a.points !== b.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdA !== gdB) return gdB - gdA;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return b.team.elo - a.team.elo;
}

const GROUP_FIXTURES: [number, number][] = [
  [0, 1], [2, 3],
  [0, 2], [1, 3],
  [0, 3], [1, 2],
];

export function simulateGroupStage(runCount: number = 30000, seed: number = 2026): SimulationResult {
  const rng = mulberry32(seed);
  const groups: Record<string, GroupProbabilities[]> = {};

  for (const g of GROUP_NAMES) {
    const teams = getTeamsByGroup(g);
    const positions: Record<string, number[]> = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], 3: [0, 0, 0, 0], 4: [0, 0, 0, 0] };

    for (let run = 0; run < runCount; run++) {
      const standings: SimGroupStanding[] = teams.map(t => ({
        team: t,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0,
      }));

      for (const [i, j] of GROUP_FIXTURES) {
        const home = teams[i];
        const away = teams[j];
        // Group stage: neutral venue (no home advantage)
        const homeLambda = expectedGoals(home.elo, away.elo);
        const awayLambda = expectedGoals(away.elo, home.elo);

        const hGoals = poissonRandom(homeLambda, rng);
        const aGoals = poissonRandom(awayLambda, rng);

        standings[i].played++;
        standings[j].played++;
        standings[i].goalsFor += hGoals;
        standings[i].goalsAgainst += aGoals;
        standings[j].goalsFor += aGoals;
        standings[j].goalsAgainst += hGoals;

        if (hGoals > aGoals) {
          standings[i].won++; standings[i].points += 3;
          standings[j].lost++;
        } else if (hGoals === aGoals) {
          standings[i].drawn++; standings[i].points += 1;
          standings[j].drawn++; standings[j].points += 1;
        } else {
          standings[j].won++; standings[j].points += 3;
          standings[i].lost++;
        }
      }

      standings.sort(compareStandings);

      for (let pos = 0; pos < 4; pos++) {
        positions[pos + 1][teams.indexOf(standings[pos].team)]++;
      }
    }

    groups[g] = teams.map((t, idx) => ({
      team: t,
      p1st: (positions[1][idx] / runCount) * 100,
      p2nd: (positions[2][idx] / runCount) * 100,
      p3rd: (positions[3][idx] / runCount) * 100,
      p4th: (positions[4][idx] / runCount) * 100,
      pAdvance: 0,
    }));
  }

  // Best 3rd-place advancement: 8 of 12 3rd-place teams advance
  const groupStrengths = GROUP_NAMES.map(g => {
    const teams = getTeamsByGroup(g);
    return teams.reduce((sum, t) => sum + t.elo, 0) / 4;
  });

  const rankedGroups = GROUP_NAMES.map((g, i) => ({ group: g, strength: groupStrengths[i] }))
    .sort((a, b) => b.strength - a.strength);

  const thirdAdvanceProbs: Record<string, number> = {};
  rankedGroups.forEach((g, i) => {
    if (i < 4) thirdAdvanceProbs[g.group] = 0.82;
    else if (i < 8) thirdAdvanceProbs[g.group] = 0.65;
    else thirdAdvanceProbs[g.group] = 0.48;
  });

  for (const g of GROUP_NAMES) {
    for (const gp of groups[g]) {
      gp.pAdvance = gp.p1st + gp.p2nd + gp.p3rd * thirdAdvanceProbs[g];
    }
  }

  return {
    groups,
    simulationRuns: runCount,
    modelVersion: 'Elo-Poisson-DC-v1.0',
  };
}
