/**
 * Official FIFA 2026 World Cup bracket seeding.
 * Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup + ESPN official schedule
 *
 * Match numbering:
 *   Group stage: M1-M72
 *   Round of 32: M73-M88 (16 matches)
 *   Round of 16: M89-M96 (8 matches)
 *   Quarter-finals: M97-M100 (4 matches)
 *   Semi-finals: M101-M102 (2 matches)
 *   Third place: M103
 *   Final: M104
 */

import { GROUP_NAMES } from '../data/worldCup2026';
import type { SimulationResult } from './prediction';

// ── Types ───────────────────────────────────────────────────────────────
export interface BracketTeamSlot {
  code: string;          // team code, or 'TBD'
  label: string;         // e.g. "1E", "2A", "3rd A/B/C/D/F"
  isActual: boolean;     // from real fixture data
  prob?: number;         // advancement probability (for display)
}

export interface BracketMatch {
  matchNum: number;      // M73-M88 for R32
  home: BracketTeamSlot;
  away: BracketTeamSlot;
  winner: BracketTeamSlot | null;
  isActual: boolean;     // winner is from real result
  stage: 'r32' | 'r16' | 'qf' | 'sf' | 'final';
}

export interface ResolvedBracket {
  r32: BracketMatch[];   // 16 matches
  r16: BracketMatch[];   // 8 matches
  qf:  BracketMatch[];   // 4 matches
  sf:  BracketMatch[];   // 2 matches
  final: BracketMatch;
}

// ── Official R32 seeding (M73-M88, top to bottom as per Wikipedia image) ─
// Format: ['slotKey', 'slotKey']
// slotKey: '1X' = winner group X, '2X' = runner-up group X, '3ABCD' = 3rd from pool
export const R32_SEEDING: Array<{
  matchNum: number;
  home: string;
  away: string;
  r16Match: number;  // which R16 match this feeds into
}> = [
  // TOP HALF → R16 M89 and M90 → QF M97 → SF M101
  { matchNum: 73, home: '2A', away: '2B',         r16Match: 90 },
  { matchNum: 74, home: '1E', away: '3ABCDF',     r16Match: 89 },
  { matchNum: 75, home: '1F', away: '2C',         r16Match: 90 },
  { matchNum: 76, home: '1C', away: '2F',         r16Match: 91 },
  { matchNum: 77, home: '1I', away: '3CDFGH',     r16Match: 89 },
  { matchNum: 78, home: '2E', away: '2I',         r16Match: 91 },
  { matchNum: 79, home: '1A', away: '3CEFHI',     r16Match: 92 },
  { matchNum: 80, home: '1L', away: '3EHIJK',     r16Match: 92 },

  // BOTTOM HALF → R16 M93, M94, M95, M96 → QF M99, M100 → SF M102
  { matchNum: 81, home: '1D', away: '3BEFIJ',     r16Match: 94 },
  { matchNum: 82, home: '1G', away: '3AEHIJ',     r16Match: 94 },  // (also listed as 3rd A/E/H/I/J)
  { matchNum: 83, home: '2K', away: '2L',         r16Match: 93 },
  { matchNum: 84, home: '1H', away: '2J',         r16Match: 93 },
  { matchNum: 85, home: '1B', away: '3EFGIJ',     r16Match: 96 },
  { matchNum: 86, home: '1J', away: '2H',         r16Match: 95 },
  { matchNum: 87, home: '1K', away: '3DEIJL',     r16Match: 96 },
  { matchNum: 88, home: '2D', away: '2G',         r16Match: 95 },
];

// R16: which two R32 match numbers feed each R16 match
const R16_SEEDING: Array<{ matchNum: number; fromR32: [number, number]; qfMatch: number }> = [
  { matchNum: 89, fromR32: [74, 77], qfMatch: 97 },
  { matchNum: 90, fromR32: [73, 75], qfMatch: 97 },
  { matchNum: 91, fromR32: [76, 78], qfMatch: 98 },
  { matchNum: 92, fromR32: [79, 80], qfMatch: 98 },
  { matchNum: 93, fromR32: [83, 84], qfMatch: 99 },
  { matchNum: 94, fromR32: [81, 82], qfMatch: 99 },
  { matchNum: 95, fromR32: [86, 88], qfMatch: 100 },
  { matchNum: 96, fromR32: [85, 87], qfMatch: 100 },
];

const QF_SEEDING: Array<{ matchNum: number; fromR16: [number, number]; sfMatch: number }> = [
  { matchNum: 97,  fromR16: [89, 90], sfMatch: 101 },
  { matchNum: 98,  fromR16: [91, 92], sfMatch: 101 },
  { matchNum: 99,  fromR16: [93, 94], sfMatch: 102 },
  { matchNum: 100, fromR16: [95, 96], sfMatch: 102 },
];

const SF_SEEDING: Array<{ matchNum: number; fromQF: [number, number] }> = [
  { matchNum: 101, fromQF: [97, 98] },
  { matchNum: 102, fromQF: [99, 100] },
];

// ── Derive predicted group positions from simulation ────────────────────
export function getPredictedGroupPositions(
  sim: SimulationResult
): Record<string, { first: string; second: string; thirds: string[] }> {
  const result: Record<string, { first: string; second: string; thirds: string[] }> = {};

  for (const g of GROUP_NAMES) {
    const groupData = sim.groups[g];
    const sorted = [...groupData].sort((a, b) => b.p1st - a.p1st);
    const bySecond = [...groupData].sort((a, b) => b.p2nd - a.p2nd);
    const byThird = [...groupData].sort((a, b) => b.p3rd - a.p3rd);

    result[g] = {
      first: sorted[0].team.code,
      second: bySecond[0].team.code !== sorted[0].team.code
        ? bySecond[0].team.code
        : bySecond[1].team.code,
      thirds: byThird
        .filter(d => d.team.code !== sorted[0].team.code)
        .slice(0, 2)
        .map(d => d.team.code),
    };
  }
  return result;
}

// ── Resolve a slot label to a team code ────────────────────────────────
function resolveSlot(
  slot: string,
  predicted: Record<string, { first: string; second: string; thirds: string[] }>,
  actual?: Record<string, string[]>
): BracketTeamSlot {
  // Use actual if available
  const source = actual || null;

  if (slot.startsWith('1')) {
    const g = slot.slice(1);
    const code = source?.[g]?.[0] ?? predicted[g]?.first ?? 'TBD';
    return { code, label: `1st Group ${g}`, isActual: !!source?.[g], prob: undefined };
  }
  if (slot.startsWith('2')) {
    const g = slot.slice(1);
    const code = source?.[g]?.[1] ?? predicted[g]?.second ?? 'TBD';
    return { code, label: `2nd Group ${g}`, isActual: !!source?.[g], prob: undefined };
  }
  if (slot.startsWith('3')) {
    return { code: 'TBD', label: `3rd ${slot.slice(1)}`, isActual: false };
  }
  return { code: 'TBD', label: slot, isActual: false };
}

// ── Build the full resolved bracket ────────────────────────────────────
export function buildOfficialBracket(
  sim: SimulationResult,
  actualGroupPositions?: Record<string, string[]>,  // code arrays per group, sorted 1st-4th
  actualKnockoutResults?: Record<string, string>    // 'R32-73' → winner code etc.
): ResolvedBracket {
  const predicted = getPredictedGroupPositions(sim);

  // Build lookup: matchNum → BracketMatch
  const matchMap = new Map<number, BracketMatch>();

  // ── R32 ──────────────────────────────────────────────────────────────
  const r32: BracketMatch[] = R32_SEEDING.map(s => {
    const home = resolveSlot(s.home, predicted, actualGroupPositions);
    const away = resolveSlot(s.away, predicted, actualGroupPositions);

    // Determine winner
    const realWinnerCode = actualKnockoutResults?.[`R32-${s.matchNum}`];
    let winner: BracketTeamSlot | null = null;
    let isActual = false;

    if (realWinnerCode) {
      winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
      isActual = true;
    } else if (home.code !== 'TBD' && away.code !== 'TBD') {
      // Predict: use simulation knockout probs if available, otherwise Elo
      const homeProb = (sim.knockout.r32Prob[home.code] || 0);
      const awayProb = (sim.knockout.r32Prob[away.code] || 0);
      const winnerCode = homeProb >= awayProb ? home.code : away.code;
      winner = { code: winnerCode, label: winnerCode, isActual: false };
    }

    const match: BracketMatch = { matchNum: s.matchNum, home, away, winner, isActual, stage: 'r32' };
    matchMap.set(s.matchNum, match);
    return match;
  });

  // ── R16 ──────────────────────────────────────────────────────────────
  const r16: BracketMatch[] = R16_SEEDING.map(s => {
    const [m1, m2] = s.fromR32;
    const homeSlot = matchMap.get(m1)?.winner;
    const awaySlot = matchMap.get(m2)?.winner;

    const home: BracketTeamSlot = homeSlot || { code: 'TBD', label: `W M${m1}`, isActual: false };
    const away: BracketTeamSlot = awaySlot || { code: 'TBD', label: `W M${m2}`, isActual: false };

    const realWinnerCode = actualKnockoutResults?.[`R16-${s.matchNum}`];
    let winner: BracketTeamSlot | null = null;
    let isActual = false;

    if (realWinnerCode) {
      winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
      isActual = true;
    } else if (home.code !== 'TBD' && away.code !== 'TBD') {
      const homeProb = sim.knockout.r16Prob[home.code] || 0;
      const awayProb = sim.knockout.r16Prob[away.code] || 0;
      const winnerCode = homeProb >= awayProb ? home.code : away.code;
      winner = { code: winnerCode, label: winnerCode, isActual: false };
    }

    const match: BracketMatch = { matchNum: s.matchNum, home, away, winner, isActual, stage: 'r16' };
    matchMap.set(s.matchNum, match);
    return match;
  });

  // ── QF ───────────────────────────────────────────────────────────────
  const qf: BracketMatch[] = QF_SEEDING.map(s => {
    const [r1, r2] = s.fromR16;
    const homeSlot = matchMap.get(r1)?.winner;
    const awaySlot = matchMap.get(r2)?.winner;

    const home: BracketTeamSlot = homeSlot || { code: 'TBD', label: `W M${r1}`, isActual: false };
    const away: BracketTeamSlot = awaySlot || { code: 'TBD', label: `W M${r2}`, isActual: false };

    const realWinnerCode = actualKnockoutResults?.[`QF-${s.matchNum}`];
    let winner: BracketTeamSlot | null = null;
    let isActual = false;

    if (realWinnerCode) {
      winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
      isActual = true;
    } else if (home.code !== 'TBD' && away.code !== 'TBD') {
      const homeProb = sim.knockout.qfProb[home.code] || 0;
      const awayProb = sim.knockout.qfProb[away.code] || 0;
      const winnerCode = homeProb >= awayProb ? home.code : away.code;
      winner = { code: winnerCode, label: winnerCode, isActual: false };
    }

    const match: BracketMatch = { matchNum: s.matchNum, home, away, winner, isActual, stage: 'qf' };
    matchMap.set(s.matchNum, match);
    return match;
  });

  // ── SF ───────────────────────────────────────────────────────────────
  const sf: BracketMatch[] = SF_SEEDING.map(s => {
    const [q1, q2] = s.fromQF;
    const homeSlot = matchMap.get(q1)?.winner;
    const awaySlot = matchMap.get(q2)?.winner;

    const home: BracketTeamSlot = homeSlot || { code: 'TBD', label: `W M${q1}`, isActual: false };
    const away: BracketTeamSlot = awaySlot || { code: 'TBD', label: `W M${q2}`, isActual: false };

    const realWinnerCode = actualKnockoutResults?.[`SF-${s.matchNum}`];
    let winner: BracketTeamSlot | null = null;
    let isActual = false;

    if (realWinnerCode) {
      winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
      isActual = true;
    } else if (home.code !== 'TBD' && away.code !== 'TBD') {
      const homeProb = sim.knockout.sfProb[home.code] || 0;
      const awayProb = sim.knockout.sfProb[away.code] || 0;
      const winnerCode = homeProb >= awayProb ? home.code : away.code;
      winner = { code: winnerCode, label: winnerCode, isActual: false };
    }

    const match: BracketMatch = { matchNum: s.matchNum, home, away, winner, isActual, stage: 'sf' };
    matchMap.set(s.matchNum, match);
    return match;
  });

  // ── Final ─────────────────────────────────────────────────────────────
  const sf1 = matchMap.get(101)?.winner;
  const sf2 = matchMap.get(102)?.winner;

  const finalHome: BracketTeamSlot = sf1 || { code: 'TBD', label: 'W SF1', isActual: false };
  const finalAway: BracketTeamSlot = sf2 || { code: 'TBD', label: 'W SF2', isActual: false };

  const realFinalWinner = actualKnockoutResults?.['Final-104'];
  let finalWinner: BracketTeamSlot | null = null;
  let finalIsActual = false;

  if (realFinalWinner) {
    finalWinner = { code: realFinalWinner, label: realFinalWinner, isActual: true };
    finalIsActual = true;
  } else if (finalHome.code !== 'TBD' && finalAway.code !== 'TBD') {
    const hp = sim.knockout.championProb[finalHome.code] || 0;
    const ap = sim.knockout.championProb[finalAway.code] || 0;
    const wCode = hp >= ap ? finalHome.code : finalAway.code;
    finalWinner = { code: wCode, label: wCode, isActual: false };
  }

  const final: BracketMatch = {
    matchNum: 104, home: finalHome, away: finalAway,
    winner: finalWinner, isActual: finalIsActual, stage: 'final',
  };

  return { r32, r16, qf, sf, final };
}
