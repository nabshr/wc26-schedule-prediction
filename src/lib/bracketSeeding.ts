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
  stage: 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
}

export interface ResolvedBracket {
  r32: BracketMatch[];   // 16 matches
  r16: BracketMatch[];   // 8 matches
  qf:  BracketMatch[];   // 4 matches
  sf:  BracketMatch[];   // 2 matches
  thirdPlace: BracketMatch;
  final: BracketMatch;
}

/**
 * Real fixture data extracted from the API/Supabase for any knockout stage.
 * home/away are team codes; winner is the winning team code (already resolved,
 * not 'home'/'away' strings).
 */
export interface RealKnockoutFixture {
  home: string;
  away: string;
  winner?: string;   // actual winner team code, undefined if match not yet played
}

// ── Official R32 seeding (M73-M88) — verified against Wikipedia/fifa.com ─
// Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
// Format: ['slotKey', 'slotKey']
// slotKey: '1X' = winner group X, '2X' = runner-up group X, '3ABCD' = 3rd from pool
export const R32_SEEDING: Array<{
  matchNum: number;
  home: string;
  away: string;
  r16Match: number;  // which R16 match this feeds into
}> = [
  // TOP HALF → R16 M89 and M90 → QF M97 → SF M101
  { matchNum: 74, home: '1E', away: '3ABCDF',     r16Match: 89 }, // GER vs PAR
  { matchNum: 77, home: '1I', away: '3CDFGH',     r16Match: 89 }, // FRA vs SWE
  { matchNum: 73, home: '2A', away: '2B',         r16Match: 90 }, // RSA vs CAN
  { matchNum: 75, home: '1F', away: '2C',         r16Match: 90 }, // NED vs MAR
  { matchNum: 83, home: '2K', away: '2L',         r16Match: 93 }, // POR vs CRO
  { matchNum: 84, home: '1H', away: '2J',         r16Match: 93 }, // ESP vs AUT
  { matchNum: 81, home: '1D', away: '3BEFIJ',     r16Match: 94 }, // USA vs BIH
  { matchNum: 82, home: '1G', away: '3AEHIJ',     r16Match: 94 }, // BEL vs SEN

  // BOTTOM HALF → R16 M91, M92, M95, M96 → QF M98, M99, M100 → SF M102
  { matchNum: 76, home: '1C', away: '2F',         r16Match: 91 }, // BRA vs JPN
  { matchNum: 78, home: '2E', away: '2I',         r16Match: 91 }, // CIV vs NOR
  { matchNum: 79, home: '1A', away: '3CEFHI',     r16Match: 92 }, // MEX vs ECU
  { matchNum: 80, home: '1L', away: '3EHIJK',     r16Match: 92 }, // ENG vs COD
  { matchNum: 86, home: '1J', away: '2H',         r16Match: 95 }, // ARG vs CPV
  { matchNum: 88, home: '2D', away: '2G',         r16Match: 95 }, // AUS vs EGY
  { matchNum: 85, home: '1B', away: '3EFGIJ',     r16Match: 96 }, // SUI vs ALG
  { matchNum: 87, home: '1K', away: '3DEIJL',     r16Match: 96 }, // COL vs GHA
];

// R16: which two R32 match numbers feed each R16 match (verified vs fifa.com)
export const R16_SEEDING: Array<{ matchNum: number; fromR32: [number, number]; qfMatch: number }> = [
  // TOP HALF
  { matchNum: 89, fromR32: [74, 77], qfMatch: 97 },
  { matchNum: 90, fromR32: [73, 75], qfMatch: 97 },
  { matchNum: 93, fromR32: [83, 84], qfMatch: 98 },
  { matchNum: 94, fromR32: [81, 82], qfMatch: 98 },
  // BOTTOM HALF
  { matchNum: 91, fromR32: [76, 78], qfMatch: 99 },
  { matchNum: 92, fromR32: [79, 80], qfMatch: 99 },
  { matchNum: 95, fromR32: [86, 88], qfMatch: 100 },
  { matchNum: 96, fromR32: [85, 87], qfMatch: 100 },
];

export const QF_SEEDING: Array<{ matchNum: number; fromR16: [number, number]; sfMatch: number }> = [
  { matchNum: 97,  fromR16: [89, 90], sfMatch: 101 },
  { matchNum: 98,  fromR16: [93, 94], sfMatch: 101 },
  { matchNum: 99,  fromR16: [91, 92], sfMatch: 102 },
  { matchNum: 100, fromR16: [95, 96], sfMatch: 102 },
];

export const SF_SEEDING: Array<{ matchNum: number; fromQF: [number, number] }> = [
  { matchNum: 101, fromQF: [97, 98] },
  { matchNum: 102, fromQF: [99, 100] },
];

// ── Feeder maps keyed by matchNum -> [feederMatchNum1, feederMatchNum2] ──
// Convenience exports for bracket connector-line rendering.
export const R16_FEEDERS: Record<number, [number, number]> = Object.fromEntries(
  R16_SEEDING.map(s => [s.matchNum, s.fromR32])
);
export const QF_FEEDERS: Record<number, [number, number]> = Object.fromEntries(
  QF_SEEDING.map(s => [s.matchNum, s.fromR16])
);
export const SF_FEEDERS: Record<number, [number, number]> = Object.fromEntries(
  SF_SEEDING.map(s => [s.matchNum, s.fromQF])
);

// ── Derive predicted group positions from simulation ────────────────────
export function getPredictedGroupPositions(
  sim: SimulationResult
): Record<string, { first: string; second: string; third: string }> {
  const result: Record<string, { first: string; second: string; third: string }> = {};

  for (const g of GROUP_NAMES) {
    const groupData = sim.groups[g];

    const first = [...groupData].sort((a, b) => b.p1st - a.p1st)[0].team.code;

    const secondCandidates = [...groupData]
      .filter(d => d.team.code !== first)
      .sort((a, b) => b.p2nd - a.p2nd);
    const second = secondCandidates[0]?.team.code ?? 'TBD';

    const thirdCandidates = [...groupData]
      .filter(d => d.team.code !== first && d.team.code !== second)
      .sort((a, b) => b.p3rd - a.p3rd);
    const third = thirdCandidates[0]?.team.code ?? 'TBD';

    result[g] = { first, second, third };
  }

  return result;
}

function pickRandomThirdFromPool(
  poolGroups: string[],
  predicted: Record<string, { first: string; second: string; third: string }>,
  actual: Record<string, string[]> | undefined,
  usedThirdCodes: Set<string>
): BracketTeamSlot | null {
  const candidates: BracketTeamSlot[] = [];

  for (const g of poolGroups) {
    const actualCode = actual?.[g]?.[2];
    if (actualCode && !usedThirdCodes.has(actualCode)) {
      candidates.push({
        code: actualCode,
        label: `3rd Group ${g}`,
        isActual: true,
      });
      continue;
    }

    const predictedCode = predicted[g]?.third;
    if (predictedCode && predictedCode !== 'TBD' && !usedThirdCodes.has(predictedCode)) {
      candidates.push({
        code: predictedCode,
        label: `3rd Group ${g}`,
        isActual: false,
      });
    }
  }

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  usedThirdCodes.add(pick.code);
  return pick;
}

// ── Resolve a slot label to a team code ────────────────────────────────
function resolveSlot(
  slot: string,
  predicted: Record<string, { first: string; second: string; third: string }>,
  actual: Record<string, string[]> | undefined,
  usedThirdCodes: Set<string>
): BracketTeamSlot {
  if (slot.startsWith('1')) {
    const g = slot.slice(1);
    const code = actual?.[g]?.[0] ?? predicted[g]?.first ?? 'TBD';
    return { code, label: `1st Group ${g}`, isActual: !!actual?.[g] };
  }

  if (slot.startsWith('2')) {
    const g = slot.slice(1);
    const code = actual?.[g]?.[1] ?? predicted[g]?.second ?? 'TBD';
    return { code, label: `2nd Group ${g}`, isActual: !!actual?.[g] };
  }

  if (slot.startsWith('3')) {
    const poolGroups = slot.slice(1).split('');
    const picked = pickRandomThirdFromPool(poolGroups, predicted, actual, usedThirdCodes);
    return picked ?? { code: 'TBD', label: `3rd ${slot.slice(1)}`, isActual: false };
  }

  return { code: 'TBD', label: slot, isActual: false };
}

// ── Pick predicted winner between two teams using sim probs ────────────
function predictWinner(
  homeCode: string,
  awayCode: string,
  probMap: Record<string, number>
): string {
  const hp = probMap[homeCode] || 0;
  const ap = probMap[awayCode] || 0;
  return hp >= ap ? homeCode : awayCode;
}

// ── Build one match from either real fixture data or slot resolution ────
function buildMatch(
  matchNum: number,
  stage: BracketMatch['stage'],
  // slot-based fallback
  homeSlotKey: string | null,
  awaySlotKey: string | null,
  // real fixture override (teams already known from API)
  realFixture: RealKnockoutFixture | undefined,
  // for slot resolution
  predicted: Record<string, { first: string; second: string; third: string }>,
  actualGroupPositions: Record<string, string[]> | undefined,
  usedThirdCodes: Set<string>,
  // for winner prediction
  probMap: Record<string, number>,
  // real winner from completed knockout result
  actualKnockoutResults: Record<string, string> | undefined,
  resultKey: string,
  matchMap: Map<number, BracketMatch>
): BracketMatch {
  let home: BracketTeamSlot;
  let away: BracketTeamSlot;

  if (realFixture && realFixture.home !== 'TBD' && realFixture.away !== 'TBD') {
    // API gave us the real teams for this match
    home = { code: realFixture.home, label: realFixture.home, isActual: true };
    away = { code: realFixture.away, label: realFixture.away, isActual: true };
  } else if (homeSlotKey !== null && awaySlotKey !== null) {
    // Derive from predecessor match winners or group positions
    home = resolveSlot(homeSlotKey, predicted, actualGroupPositions, usedThirdCodes);
    away = resolveSlot(awaySlotKey, predicted, actualGroupPositions, usedThirdCodes);
  } else {
    home = { code: 'TBD', label: 'TBD', isActual: false };
    away = { code: 'TBD', label: 'TBD', isActual: false };
  }

  // Resolve winner
  const realWinnerCode = realFixture?.winner ?? actualKnockoutResults?.[resultKey];
  let winner: BracketTeamSlot | null = null;
  let isActual = false;

  if (realWinnerCode && realWinnerCode !== 'TBD') {
    winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
    isActual = true;
  } else if (home.code !== 'TBD' && away.code !== 'TBD') {
    const winnerCode = predictWinner(home.code, away.code, probMap);
    winner = { code: winnerCode, label: winnerCode, isActual: false };
  }

  const match: BracketMatch = { matchNum, home, away, winner, isActual, stage };
  matchMap.set(matchNum, match);
  return match;
}

// ── Build the full resolved bracket ────────────────────────────────────
export function buildOfficialBracket(
  sim: SimulationResult,
  actualGroupPositions?: Record<string, string[]>,
  actualKnockoutResults?: Record<string, string>,
  // Real fixture pairings from the API, keyed by match number (73-104)
  actualKnockoutFixtures?: Record<number, RealKnockoutFixture>
): ResolvedBracket {
  const predicted = getPredictedGroupPositions(sim);
  const usedThirdCodes = new Set<string>();
  const matchMap = new Map<number, BracketMatch>();

  // ── R32 ──────────────────────────────────────────────────────────────
  const r32: BracketMatch[] = R32_SEEDING.map(s =>
    buildMatch(
      s.matchNum, 'r32',
      s.home, s.away,
      actualKnockoutFixtures?.[s.matchNum],
      predicted, actualGroupPositions, usedThirdCodes,
      sim.knockout.r32Prob ?? {},
      actualKnockoutResults, `R32-${s.matchNum}`,
      matchMap
    )
  );

  // ── R16 ──────────────────────────────────────────────────────────────
  const r16: BracketMatch[] = R16_SEEDING.map(s => {
    const [m1, m2] = s.fromR32;
    const realFixture = actualKnockoutFixtures?.[s.matchNum];

    // If no real fixture, derive slots from R32 winners
    let homeSlotKey: string | null = null;
    let awaySlotKey: string | null = null;

    if (!realFixture || realFixture.home === 'TBD') {
      const w1 = matchMap.get(m1)?.winner;
      const w2 = matchMap.get(m2)?.winner;
      // Use winner codes as pseudo-slot-keys by injecting them directly
      if (w1) homeSlotKey = null; // handled below via slot override
      if (w2) awaySlotKey = null;

      // Build slots from predecessor winners
      const homeSlot: BracketTeamSlot = w1 || { code: 'TBD', label: `W M${m1}`, isActual: false };
      const awaySlot: BracketTeamSlot = w2 || { code: 'TBD', label: `W M${m2}`, isActual: false };

      const realWinnerCode = actualKnockoutResults?.[`R16-${s.matchNum}`];
      let winner: BracketTeamSlot | null = null;
      let isActual = false;

      if (realWinnerCode) {
        winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
        isActual = true;
      } else if (homeSlot.code !== 'TBD' && awaySlot.code !== 'TBD') {
        const wCode = predictWinner(homeSlot.code, awaySlot.code, sim.knockout.r16Prob ?? {});
        winner = { code: wCode, label: wCode, isActual: false };
      }

      const match: BracketMatch = {
        matchNum: s.matchNum, home: homeSlot, away: awaySlot, winner, isActual, stage: 'r16',
      };
      matchMap.set(s.matchNum, match);
      return match;
    }

    // Real fixture available — use buildMatch
    return buildMatch(
      s.matchNum, 'r16',
      null, null,
      realFixture,
      predicted, actualGroupPositions, usedThirdCodes,
      sim.knockout.r16Prob ?? {},
      actualKnockoutResults, `R16-${s.matchNum}`,
      matchMap
    );
  });

  // ── QF ───────────────────────────────────────────────────────────────
  const qf: BracketMatch[] = QF_SEEDING.map(s => {
    const [r1, r2] = s.fromR16;
    const realFixture = actualKnockoutFixtures?.[s.matchNum];

    if (!realFixture || realFixture.home === 'TBD') {
      const homeSlot = matchMap.get(r1)?.winner || { code: 'TBD', label: `W M${r1}`, isActual: false };
      const awaySlot = matchMap.get(r2)?.winner || { code: 'TBD', label: `W M${r2}`, isActual: false };

      const realWinnerCode = actualKnockoutResults?.[`QF-${s.matchNum}`];
      let winner: BracketTeamSlot | null = null;
      let isActual = false;

      if (realWinnerCode) {
        winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
        isActual = true;
      } else if (homeSlot.code !== 'TBD' && awaySlot.code !== 'TBD') {
        const wCode = predictWinner(homeSlot.code, awaySlot.code, sim.knockout.qfProb ?? {});
        winner = { code: wCode, label: wCode, isActual: false };
      }

      const match: BracketMatch = {
        matchNum: s.matchNum, home: homeSlot, away: awaySlot, winner, isActual, stage: 'qf',
      };
      matchMap.set(s.matchNum, match);
      return match;
    }

    return buildMatch(
      s.matchNum, 'qf',
      null, null,
      realFixture,
      predicted, actualGroupPositions, usedThirdCodes,
      sim.knockout.qfProb ?? {},
      actualKnockoutResults, `QF-${s.matchNum}`,
      matchMap
    );
  });

  // ── SF ───────────────────────────────────────────────────────────────
  const sf: BracketMatch[] = SF_SEEDING.map(s => {
    const [q1, q2] = s.fromQF;
    const realFixture = actualKnockoutFixtures?.[s.matchNum];

    if (!realFixture || realFixture.home === 'TBD') {
      const homeSlot = matchMap.get(q1)?.winner || { code: 'TBD', label: `W M${q1}`, isActual: false };
      const awaySlot = matchMap.get(q2)?.winner || { code: 'TBD', label: `W M${q2}`, isActual: false };

      const realWinnerCode = actualKnockoutResults?.[`SF-${s.matchNum}`];
      let winner: BracketTeamSlot | null = null;
      let isActual = false;

      if (realWinnerCode) {
        winner = { code: realWinnerCode, label: realWinnerCode, isActual: true };
        isActual = true;
      } else if (homeSlot.code !== 'TBD' && awaySlot.code !== 'TBD') {
        const wCode = predictWinner(homeSlot.code, awaySlot.code, sim.knockout.sfProb ?? {});
        winner = { code: wCode, label: wCode, isActual: false };
      }

      const match: BracketMatch = {
        matchNum: s.matchNum, home: homeSlot, away: awaySlot, winner, isActual, stage: 'sf',
      };
      matchMap.set(s.matchNum, match);
      return match;
    }

    return buildMatch(
      s.matchNum, 'sf',
      null, null,
      realFixture,
      predicted, actualGroupPositions, usedThirdCodes,
      sim.knockout.sfProb ?? {},
      actualKnockoutResults, `SF-${s.matchNum}`,
      matchMap
    );
  });

  // ── Third place ───────────────────────────────────────────────────────
  const sf101 = matchMap.get(101);
  const sf102 = matchMap.get(102);
  const sf1Winner = sf101?.winner;
  const sf2Winner = sf102?.winner;

  const sf1Loser =
    sf101 && sf101.home.code !== 'TBD' && sf101.away.code !== 'TBD' && sf1Winner
      ? (sf1Winner.code === sf101.home.code ? sf101.away : sf101.home)
      : null;
  const sf2Loser =
    sf102 && sf102.home.code !== 'TBD' && sf102.away.code !== 'TBD' && sf2Winner
      ? (sf2Winner.code === sf102.home.code ? sf102.away : sf102.home)
      : null;

  const realThirdFixture = actualKnockoutFixtures?.[103];
  let thirdHome: BracketTeamSlot;
  let thirdAway: BracketTeamSlot;

  if (realThirdFixture && realThirdFixture.home !== 'TBD') {
    thirdHome = { code: realThirdFixture.home, label: realThirdFixture.home, isActual: true };
    thirdAway = { code: realThirdFixture.away, label: realThirdFixture.away, isActual: true };
  } else {
    thirdHome = sf1Loser || { code: 'TBD', label: 'L SF1', isActual: false };
    thirdAway = sf2Loser || { code: 'TBD', label: 'L SF2', isActual: false };
  }

  const realThirdWinner = realThirdFixture?.winner ?? actualKnockoutResults?.['Third-103'];
  let thirdWinner: BracketTeamSlot | null = null;
  let thirdIsActual = false;

  if (realThirdWinner) {
    thirdWinner = { code: realThirdWinner, label: realThirdWinner, isActual: true };
    thirdIsActual = true;
  } else if (thirdHome.code !== 'TBD' && thirdAway.code !== 'TBD') {
    const wCode = predictWinner(thirdHome.code, thirdAway.code, sim.knockout.sfProb ?? {});
    thirdWinner = { code: wCode, label: wCode, isActual: false };
  }

  const thirdPlace: BracketMatch = {
    matchNum: 103, home: thirdHome, away: thirdAway,
    winner: thirdWinner, isActual: thirdIsActual, stage: 'third',
  };

  // ── Final ─────────────────────────────────────────────────────────────
  const realFinalFixture = actualKnockoutFixtures?.[104];
  let finalHome: BracketTeamSlot;
  let finalAway: BracketTeamSlot;

  if (realFinalFixture && realFinalFixture.home !== 'TBD') {
    finalHome = { code: realFinalFixture.home, label: realFinalFixture.home, isActual: true };
    finalAway = { code: realFinalFixture.away, label: realFinalFixture.away, isActual: true };
  } else {
    finalHome = sf1Winner || { code: 'TBD', label: 'W SF1', isActual: false };
    finalAway = sf2Winner || { code: 'TBD', label: 'W SF2', isActual: false };
  }

  const realFinalWinner = realFinalFixture?.winner ?? actualKnockoutResults?.['Final-104'];
  let finalWinner: BracketTeamSlot | null = null;
  let finalIsActual = false;

  if (realFinalWinner) {
    finalWinner = { code: realFinalWinner, label: realFinalWinner, isActual: true };
    finalIsActual = true;
  } else if (finalHome.code !== 'TBD' && finalAway.code !== 'TBD') {
    const wCode = predictWinner(finalHome.code, finalAway.code, sim.knockout.championProb ?? {});
    finalWinner = { code: wCode, label: wCode, isActual: false };
  }

  const final: BracketMatch = {
    matchNum: 104, home: finalHome, away: finalAway,
    winner: finalWinner, isActual: finalIsActual, stage: 'final',
  };

  return { r32, r16, qf, sf, thirdPlace, final };
}
