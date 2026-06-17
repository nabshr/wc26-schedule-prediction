import { WC2026Team, getTeamsByGroup, getTeamByCode, GROUP_NAMES } from '../data/worldCup2026';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED, MODEL_VERSION } from './simulationConfig';

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

// ── Elo → Expected Goals (improved calibration) ────────────────────────
// Calibrated against WC historical data: average ~1.35 goals/team/game,
// with Elo differential scaling kept modest to avoid extreme predictions.
const BASE_GOALS = 1.28;
const ELO_GOAL_SCALE = 0.0016; // slightly flatter than before for stability
const HOME_ADV_FACTOR = 1.08;

function expectedGoals(eloTeam: number, eloOpponent: number): number {
  const diff = eloTeam - eloOpponent;
  // Clamp minimum at 0.40 (even weak teams score occasionally)
  return Math.max(0.40, BASE_GOALS + diff * ELO_GOAL_SCALE);
}

// ── Dixon-Coles Low-Score Correction ────────────────────────────────────
// Slightly reduced rho for better calibration vs historical WC data
const DC_RHO = 0.11;

function dixonColesAdj(
  homeGoals: number, awayGoals: number,
  homeLambda: number, awayLambda: number
): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 + DC_RHO * homeLambda * awayLambda;
  if (homeGoals === 1 && awayGoals === 0) return 1 + DC_RHO * awayLambda;
  if (homeGoals === 0 && awayGoals === 1) return 1 + DC_RHO * homeLambda;
  if (homeGoals === 1 && awayGoals === 1) return 1 - DC_RHO;
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

export function predictMatch(
  teamA: WC2026Team, teamB: WC2026Team, venue: VenueContext = 'neutral'
): MatchPrediction {
  const teamALambda = venue === 'home'
    ? expectedGoals(teamA.elo, teamB.elo) * HOME_ADV_FACTOR
    : expectedGoals(teamA.elo, teamB.elo);
  const teamBLambda = expectedGoals(teamB.elo, teamA.elo);

  const MAX_GOALS = 7;
  let teamAWinProb = 0, drawProb = 0, teamBWinProb = 0;
  let bttsProb = 0, over25Prob = 0, over15Prob = 0, over35Prob = 0;
  const scorelines: ScorelineProb[] = [];

  for (let a = 0; a <= MAX_GOALS; a++) {
    for (let b = 0; b <= MAX_GOALS; b++) {
      const rawProb = poissonPmf(a, teamALambda) * poissonPmf(b, teamBLambda);
      const prob = rawProb * dixonColesAdj(a, b, teamALambda, teamBLambda);
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

  const total = teamAWinProb + drawProb + teamBWinProb;
  teamAWinProb /= total; drawProb /= total; teamBWinProb /= total;
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
    if (s.teamA < size && s.teamB < size) matrix[s.teamA][s.teamB] = s.prob * 100;
  }
  return matrix;
}

// ── Fast seeded RNG (Mulberry32) ────────────────────────────────────────
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
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

// ── Group stage standing ────────────────────────────────────────────────
interface SimGroupStanding {
  team: WC2026Team;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number;
}

function compareStandings(a: SimGroupStanding, b: SimGroupStanding): number {
  if (a.points !== b.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst;
  if (gdA !== gdB) return gdB - gdA;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  // Tiebreak by Elo for stability
  return b.team.elo - a.team.elo;
}

const GROUP_FIXTURES: [number, number][] = [
  [0, 1], [2, 3],
  [0, 2], [1, 3],
  [0, 3], [1, 2],
];

// ── Group Probabilities ─────────────────────────────────────────────────
export interface GroupProbabilities {
  team: WC2026Team;
  p1st: number;
  p2nd: number;
  p3rd: number;
  p4th: number;
  pAdvance: number;
}

// ── Knockout round winner ────────────────────────────────────────────────
// Simulates a single knockout match (draws resolved by penalties, modelled
// as a coin-flip weighted by Elo after normal-time draw).
function simulateKnockout(teamA: WC2026Team, teamB: WC2026Team, rng: () => number): WC2026Team {
  const lambdaA = expectedGoals(teamA.elo, teamB.elo);
  const lambdaB = expectedGoals(teamB.elo, teamA.elo);
  const gA = poissonRandom(lambdaA, rng);
  const gB = poissonRandom(lambdaB, rng);
  if (gA > gB) return teamA;
  if (gB > gA) return teamB;
  // Extra time / Penalties: Elo-weighted coin flip
  return rng() < eloWinProb(teamA.elo, teamB.elo) ? teamA : teamB;
}

// ── R32 bracket seeding per official FIFA 2026 draw ────────────────────
// Format: '1X' = 1st place Group X, '2X' = 2nd place Group X
// '3AB' = best 3rd from Group A or B pool (placeholder for 3rd-place draw)
export const R32_MATCHUPS: [string, string][] = [
  ['1A', '2B'], ['1C', '2D'], ['1E', '2F'], ['1G', '2H'],
  ['1B', '2A'], ['1D', '2C'], ['1F', '2E'], ['1H', '2G'],
  ['1I', '2J'], ['1K', '2L'], ['1J', '2I'], ['1L', '2K'],
  ['3AB', '3CD'], ['3EF', '3GH'], ['3IJ', '3KL'], ['3Best1', '3Best2'],
];

// R16 pairs (winner of R32 match X plays winner of R32 match Y)
const R16_PAIRS: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [8, 9], [10, 11], [12, 13], [14, 15],
];

// QF pairs (winner of R16 match X plays winner of R16 match Y)
const QF_PAIRS: [number, number][] = [
  [0, 1], [2, 3],
  [4, 5], [6, 7],
];

// SF pairs
const SF_PAIRS: [number, number][] = [[0, 1], [2, 3]];

// ── Full knockout stage result from a single simulation run ─────────────
export interface KnockoutRunResult {
  r32: WC2026Team[];     // 16 winners
  r16: WC2026Team[];     // 8 winners
  qf: WC2026Team[];      // 4 winners
  sf: WC2026Team[];      // 2 winners
  champion: WC2026Team;
}

// ── Full simulation result ──────────────────────────────────────────────
export interface SimulationResult {
  groups: Record<string, GroupProbabilities[]>;
  knockout: KnockoutSimResult;
  simulationRuns: number;
  modelVersion: string;
}

export interface KnockoutSimResult {
  // Probability each team wins champion, reaches SF, QF, R16, R32
  championProb: Record<string, number>;
  sfProb: Record<string, number>;
  qfProb: Record<string, number>;
  r16Prob: Record<string, number>;
  r32Prob: Record<string, number>;
  // Most-likely bracket: per R32 slot, most probable team
  projectedR32: Array<{ slotA: string; slotB: string }>;   // codes
  projectedR16: Array<{ slotA: string; slotB: string }>;
  projectedQF:  Array<{ slotA: string; slotB: string }>;
  projectedSF:  Array<{ slotA: string; slotB: string }>;
  projectedFinal: { slotA: string; slotB: string };
  projectedChampion: string;
}

// ── Main simulation function ────────────────────────────────────────────
export function simulateGroupStage(
  runCount: number = DEFAULT_SIMULATION_RUNS,
  seed: number = SIMULATION_SEED
): SimulationResult {
  const rng = mulberry32(seed);

  // ── Per-group counters ────────────────────────────────────────────────
  const groupPositionCounts: Record<string, number[][]> = {};
  for (const g of GROUP_NAMES) {
    const n = getTeamsByGroup(g).length;
    groupPositionCounts[g] = Array.from({ length: n }, () => [0, 0, 0, 0]);
  }

  // ── Knockout counters ─────────────────────────────────────────────────
  const champCount: Record<string, number> = {};
  const sfCount: Record<string, number> = {};
  const qfCount: Record<string, number> = {};
  const r16Count: Record<string, number> = {};
  const r32Count: Record<string, number> = {};

  // For computing most-likely bracket: track wins per slot per team
  // r32SlotWins[slot][teamCode] = count
  const r32SlotWins: Array<Record<string, number>> = Array.from({ length: 16 }, () => ({}));
  const r16SlotWins: Array<Record<string, number>> = Array.from({ length: 8 }, () => ({}));
  const qfSlotWins: Array<Record<string, number>> = Array.from({ length: 4 }, () => ({}));
  const sfSlotWins: Array<Record<string, number>> = Array.from({ length: 2 }, () => ({}));
  const finalSlotWins: [Record<string, number>, Record<string, number>] = [{}, {}];

  for (let run = 0; run < runCount; run++) {
    // ── Simulate group stage ────────────────────────────────────────────
    const groupWinners: WC2026Team[] = [];   // 1st place from each group
    const groupRunnerUps: WC2026Team[] = []; // 2nd place from each group
    const groupThirds: WC2026Team[] = [];    // 3rd place from each group

    for (const g of GROUP_NAMES) {
      const teams = getTeamsByGroup(g);
      const standings: SimGroupStanding[] = teams.map(t => ({
        team: t, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      }));

      for (const [i, j] of GROUP_FIXTURES) {
        const h = teams[i], a = teams[j];
        const hG = poissonRandom(expectedGoals(h.elo, a.elo), rng);
        const aG = poissonRandom(expectedGoals(a.elo, h.elo), rng);
        standings[i].played++; standings[j].played++;
        standings[i].goalsFor += hG; standings[i].goalsAgainst += aG;
        standings[j].goalsFor += aG; standings[j].goalsAgainst += hG;
        if (hG > aG) { standings[i].won++; standings[i].points += 3; standings[j].lost++; }
        else if (hG === aG) { standings[i].drawn++; standings[i].points++; standings[j].drawn++; standings[j].points++; }
        else { standings[j].won++; standings[j].points += 3; standings[i].lost++; }
      }

      standings.sort(compareStandings);

      const gIdx = GROUP_NAMES.indexOf(g);
      for (let pos = 0; pos < 4; pos++) {
        const teamIdx = teams.indexOf(standings[pos].team);
        groupPositionCounts[g][teamIdx][pos]++;
      }

      groupWinners[gIdx] = standings[0].team;
      groupRunnerUps[gIdx] = standings[1].team;
      groupThirds[gIdx] = standings[2].team;
    }

    // ── Seed R32 (12 group-qualified + 8 best 3rds pick slots 13-16) ────
    // Best 8 of 12 thirds advance. Rank by Elo as proxy for expected points.
    const thirdsWithGroup = groupThirds.map((t, i) => ({ team: t, groupIdx: i }));
    thirdsWithGroup.sort((a, b) => b.team.elo - a.team.elo);
    const advancing3rds = thirdsWithGroup.slice(0, 8).map(x => x.team);

    // Build R32 participant array (16 matches × 2 teams = 32 slots)
    function slotTeam(pos: string): WC2026Team {
      const gIdx = GROUP_NAMES.indexOf(pos.slice(1));
      if (pos.startsWith('1')) return groupWinners[gIdx];
      if (pos.startsWith('2')) return groupRunnerUps[gIdx];
      // 3rd place placeholder: pull next best advancing 3rd
      const n = parseInt(pos.replace(/[^0-9]/g, '') || '0', 10);
      return advancing3rds[n % advancing3rds.length] || groupThirds[0];
    }

    const r32Participants: [WC2026Team, WC2026Team][] = R32_MATCHUPS.map(([a, b]) => [
      slotTeam(a), slotTeam(b),
    ]);

    // ── R32 ────────────────────────────────────────────────────────────
    const r32Winners: WC2026Team[] = [];
    for (let i = 0; i < 16; i++) {
      const w = simulateKnockout(r32Participants[i][0], r32Participants[i][1], rng);
      r32Winners.push(w);
      r32Count[w.code] = (r32Count[w.code] || 0) + 1;
      r32SlotWins[i][w.code] = (r32SlotWins[i][w.code] || 0) + 1;
    }

    // ── R16 ────────────────────────────────────────────────────────────
    const r16Winners: WC2026Team[] = [];
    for (let i = 0; i < 8; i++) {
      const [ai, bi] = R16_PAIRS[i];
      const w = simulateKnockout(r32Winners[ai], r32Winners[bi], rng);
      r16Winners.push(w);
      r16Count[w.code] = (r16Count[w.code] || 0) + 1;
      r16SlotWins[i][w.code] = (r16SlotWins[i][w.code] || 0) + 1;
    }

    // ── QF ─────────────────────────────────────────────────────────────
    const qfWinners: WC2026Team[] = [];
    for (let i = 0; i < 4; i++) {
      const [ai, bi] = QF_PAIRS[i];
      const w = simulateKnockout(r16Winners[ai], r16Winners[bi], rng);
      qfWinners.push(w);
      qfCount[w.code] = (qfCount[w.code] || 0) + 1;
      qfSlotWins[i][w.code] = (qfSlotWins[i][w.code] || 0) + 1;
    }

    // ── SF ─────────────────────────────────────────────────────────────
    const sfWinners: WC2026Team[] = [];
    for (let i = 0; i < 2; i++) {
      const [ai, bi] = SF_PAIRS[i];
      const w = simulateKnockout(qfWinners[ai], qfWinners[bi], rng);
      sfWinners.push(w);
      sfCount[w.code] = (sfCount[w.code] || 0) + 1;
      sfSlotWins[i][w.code] = (sfSlotWins[i][w.code] || 0) + 1;
    }

    // ── Final ──────────────────────────────────────────────────────────
    finalSlotWins[0][sfWinners[0].code] = (finalSlotWins[0][sfWinners[0].code] || 0) + 1;
    finalSlotWins[1][sfWinners[1].code] = (finalSlotWins[1][sfWinners[1].code] || 0) + 1;
    const champion = simulateKnockout(sfWinners[0], sfWinners[1], rng);
    champCount[champion.code] = (champCount[champion.code] || 0) + 1;
  }

  // ── Compute group probabilities ──────────────────────────────────────
  const groups: Record<string, GroupProbabilities[]> = {};

  // Best 3rd-place advancement rate: top-8 of 12 thirds advance
  // Use Elo rank as proxy (top-4 groups have ~82% chance, next 4 ~60%, rest ~48%)
  const groupStrengths = GROUP_NAMES.map(g => {
    const teams = getTeamsByGroup(g);
    return { group: g, strength: teams.reduce((s, t) => s + t.elo, 0) / teams.length };
  }).sort((a, b) => b.strength - a.strength);

  const thirdAdvanceProbs: Record<string, number> = {};
  groupStrengths.forEach(({ group }, i) => {
    thirdAdvanceProbs[group] = i < 4 ? 0.80 : i < 8 ? 0.60 : 0.45;
  });

  for (const g of GROUP_NAMES) {
    const teams = getTeamsByGroup(g);
    groups[g] = teams.map((t, idx) => {
      const [c1, c2, c3, c4] = groupPositionCounts[g][idx].map(c => (c / runCount) * 100);
      const pAdvance = c1 + c2 + c3 * thirdAdvanceProbs[g];
      return { team: t, p1st: c1, p2nd: c2, p3rd: c3, p4th: c4, pAdvance };
    });
  }

  // ── Most-likely bracket ──────────────────────────────────────────────
  function topCode(slotWins: Record<string, number>): string {
    return Object.entries(slotWins).sort((a, b) => b[1] - a[1])[0]?.[0] || 'TBD';
  }

  const projectedR32 = R32_MATCHUPS.map((_, i) => ({
    slotA: R32_MATCHUPS[i][0], // pos label, resolved separately in UI
    slotB: R32_MATCHUPS[i][1],
  }));

  const projectedR16 = R16_PAIRS.map((_, i) => ({
    slotA: topCode(r32SlotWins[R16_PAIRS[i][0]]),
    slotB: topCode(r32SlotWins[R16_PAIRS[i][1]]),
  }));

  const projectedQF = QF_PAIRS.map((_, i) => ({
    slotA: topCode(r16SlotWins[QF_PAIRS[i][0]]),
    slotB: topCode(r16SlotWins[QF_PAIRS[i][1]]),
  }));

  const projectedSF = SF_PAIRS.map((_, i) => ({
    slotA: topCode(qfSlotWins[SF_PAIRS[i][0]]),
    slotB: topCode(qfSlotWins[SF_PAIRS[i][1]]),
  }));

  const projectedFinal = {
    slotA: topCode(sfSlotWins[0]),
    slotB: topCode(sfSlotWins[1]),
  };

  const projectedChampion = topCode(champCount);

  const knockout: KnockoutSimResult = {
    championProb: Object.fromEntries(
      Object.entries(champCount).map(([k, v]) => [k, (v / runCount) * 100])
    ),
    sfProb: Object.fromEntries(
      Object.entries(sfCount).map(([k, v]) => [k, (v / runCount) * 100])
    ),
    qfProb: Object.fromEntries(
      Object.entries(qfCount).map(([k, v]) => [k, (v / runCount) * 100])
    ),
    r16Prob: Object.fromEntries(
      Object.entries(r16Count).map(([k, v]) => [k, (v / runCount) * 100])
    ),
    r32Prob: Object.fromEntries(
      Object.entries(r32Count).map(([k, v]) => [k, (v / runCount) * 100])
    ),
    projectedR32,
    projectedR16,
    projectedQF,
    projectedSF,
    projectedFinal,
    projectedChampion,
  };

  return { groups, knockout, simulationRuns: runCount, modelVersion: MODEL_VERSION };
}

// ── Real-result override utility ────────────────────────────────────────
// Given real completed knockout results, override the simulation bracket
// downstream. actualResults maps "R32-0", "R16-3", "QF-1" etc. to winner code.
export interface BracketSlotKey {
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  matchIndex: number;
}

export interface ResolvedBracket {
  r32: Array<{ home: string; away: string; winner: string | null; isActual: boolean }>;
  r16: Array<{ home: string; away: string; winner: string | null; isActual: boolean }>;
  qf:  Array<{ home: string; away: string; winner: string | null; isActual: boolean }>;
  sf:  Array<{ home: string; away: string; winner: string | null; isActual: boolean }>;
  final: { home: string; away: string; winner: string | null; isActual: boolean };
}

export function buildResolvedBracket(
  sim: SimulationResult,
  // realResults: map of "R32-0" → winner code, "R16-0" → winner code, etc.
  realResults: Record<string, string>,
  // groupPositions: actual group standings codes e.g. { A: ['MEX','CZE','RSA','KOR'] }
  groupPositions?: Record<string, string[]>
): ResolvedBracket {
  // Resolve a group-slot label like '1A' to a team code
  function resolveGroupSlot(pos: string): string {
    if (!groupPositions) {
      // Fall back to simulation's most-likely group positions
      const g = pos.slice(1);
      const gData = sim.groups[g];
      if (!gData) return 'TBD';
      const sorted = [...gData].sort((a, b) => {
        if (pos.startsWith('1')) return b.p1st - a.p1st;
        if (pos.startsWith('2')) return b.p2nd - a.p2nd;
        return b.p3rd - a.p3rd;
      });
      return sorted[0]?.team.code || 'TBD';
    }
    const g = pos.slice(1);
    const rank = pos.startsWith('1') ? 0 : pos.startsWith('2') ? 1 : 2;
    return groupPositions[g]?.[rank] || 'TBD';
  }

  // Seed R32
  const r32Teams: [string, string][] = R32_MATCHUPS.map(([a, b]) => [
    a.startsWith('3') ? 'TBD' : resolveGroupSlot(a),
    b.startsWith('3') ? 'TBD' : resolveGroupSlot(b),
  ]);

  // Build each round, using real results where available
  function winnerOf(round: string, idx: number, simWinner: string): { code: string; isActual: boolean } {
    const key = `${round}-${idx}`;
    if (realResults[key]) return { code: realResults[key], isActual: true };
    return { code: simWinner, isActual: false };
  }

  const r32: ResolvedBracket['r32'] = [];
  const r32Winners: string[] = [];
  for (let i = 0; i < 16; i++) {
    const [home, away] = r32Teams[i];
    const simW = sim.knockout.projectedR32[i]
      ? (getTeamByCode(home)?.elo || 0) >= (getTeamByCode(away)?.elo || 0) ? home : away
      : home;
    const { code: winner, isActual } = winnerOf('R32', i, simW);
    r32.push({ home, away, winner, isActual });
    r32Winners.push(winner);
  }

  const r16: ResolvedBracket['r16'] = [];
  const r16Winners: string[] = [];
  for (let i = 0; i < 8; i++) {
    const [ai, bi] = R16_PAIRS[i];
    const home = r32Winners[ai], away = r32Winners[bi];
    const simW = sim.knockout.projectedR16[i]?.slotA || home;
    const { code: winner, isActual } = winnerOf('R16', i, simW);
    r16.push({ home, away, winner, isActual });
    r16Winners.push(winner);
  }

  const qf: ResolvedBracket['qf'] = [];
  const qfWinners: string[] = [];
  for (let i = 0; i < 4; i++) {
    const [ai, bi] = QF_PAIRS[i];
    const home = r16Winners[ai], away = r16Winners[bi];
    const simW = sim.knockout.projectedQF[i]?.slotA || home;
    const { code: winner, isActual } = winnerOf('QF', i, simW);
    qf.push({ home, away, winner, isActual });
    qfWinners.push(winner);
  }

  const sf: ResolvedBracket['sf'] = [];
  const sfWinners: string[] = [];
  for (let i = 0; i < 2; i++) {
    const [ai, bi] = SF_PAIRS[i];
    const home = qfWinners[ai], away = qfWinners[bi];
    const simW = sim.knockout.projectedSF[i]?.slotA || home;
    const { code: winner, isActual } = winnerOf('SF', i, simW);
    sf.push({ home, away, winner, isActual });
    sfWinners.push(winner);
  }

  const finalHome = sfWinners[0], finalAway = sfWinners[1];
  const simChamp = sim.knockout.projectedChampion;
  const { code: finalWinner, isActual: finalIsActual } = winnerOf('Final', 0, simChamp);
  const final = { home: finalHome, away: finalAway, winner: finalWinner, isActual: finalIsActual };

  return { r32, r16, qf, sf, final };
}
