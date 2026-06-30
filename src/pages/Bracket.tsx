import { GitBranch, Trophy, Cpu, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';
import {
  buildOfficialBracket,
  type BracketMatch,
  type BracketTeamSlot,
  type RealKnockoutFixture,
  R16_FEEDERS,
  QF_FEEDERS,
  SF_FEEDERS,
} from '../lib/bracketSeeding';
import { useWC2026Fixtures } from '../lib/useWC2026Fixtures';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/wc26_light.png';
import logoDark from '../assets/wc26_dark.png';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED } from '../lib/simulationConfig';

// ── Derive real group positions from fixture results ────────────────────
function deriveActualGroupPositions(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures']
): Record<string, string[]> | undefined {
  const tbl: Record<string, Record<string, { pts: number; gd: number; gf: number; played: number }>> = {};

  for (const f of fixtures) {
    if (f.stage !== 'group' || f.status !== 'completed') continue;
    if (f.homeScore == null || f.awayScore == null || !f.group) continue;
    const g = f.group;
    if (!tbl[g]) tbl[g] = {};
    if (!tbl[g][f.home]) tbl[g][f.home] = { pts: 0, gd: 0, gf: 0, played: 0 };
    if (!tbl[g][f.away]) tbl[g][f.away] = { pts: 0, gd: 0, gf: 0, played: 0 };
    const h = tbl[g][f.home]; const a = tbl[g][f.away];
    h.played++; a.played++;
    h.gf += f.homeScore; h.gd += f.homeScore - f.awayScore;
    a.gf += f.awayScore; a.gd += f.awayScore - f.homeScore;
    if (f.homeScore > f.awayScore) { h.pts += 3; }
    else if (f.homeScore === f.awayScore) { h.pts += 1; a.pts += 1; }
    else { a.pts += 3; }
  }

  const result: Record<string, string[]> = {};
  for (const [g, teams] of Object.entries(tbl)) {
    if (Object.keys(teams).length < 4) continue; // group not complete
    const allPlayedEnough = Object.values(teams).every(t => t.played >= 3);
    if (!allPlayedEnough) continue;
    result[g] = Object.entries(teams)
      .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .map(([code]) => code);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ── Derive actual knockout results from fixtures ──────────────────────
// ── Extract real knockout fixture pairings + winners from Supabase data ─
// Returns a map keyed by official match number (73-104) with home/away team
// codes and (if completed) the winning team code.
// Works for ALL knockout stages: R32, R16, QF, SF, Third, Final.
function deriveActualKnockoutFixtures(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures']
): Record<number, RealKnockoutFixture> {
  const result: Record<number, RealKnockoutFixture> = {};

  // Official match number ranges per stage, in chronological kickoff order
  const STAGE_MATCH_NUMS: Record<string, number[]> = {
    r32:   [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88],
    r16:   [89,90,91,92,93,94,95,96],
    qf:    [97,98,99,100],
    sf:    [101,102],
    third: [103],
    final: [104],
  };

  const koStages = ['r32', 'r16', 'qf', 'sf', 'third', 'final'] as const;

  for (const stage of koStages) {
    const matchNums = STAGE_MATCH_NUMS[stage];

    // Get all fixtures for this stage that have real teams (not TBD),
    // sorted by kickoff so they line up with official match number order.
    const stageFx = fixtures
      .filter(f =>
        f.stage === stage &&
        f.home && f.home !== 'TBD' &&
        f.away && f.away !== 'TBD'
      )
      .sort((a, b) => (a.date + a.timeUTC).localeCompare(b.date + b.timeUTC));

    stageFx.forEach((f, i) => {
      const matchNum = matchNums[i];
      if (!matchNum) return;

      // winner_code in Supabase is stored as the actual team code (e.g. "CAN"),
      // not 'home'/'away'. Use it directly; skip only null/'draw'.
      let winner: string | undefined;
      if (f.status === 'completed' && f.winnerCode && f.winnerCode !== 'draw') {
        winner = f.winnerCode;
      }

      result[matchNum] = { home: f.home, away: f.away, winner };
    });
  }

  return result;
}

// ── Bracket geometry constants ───────────────────────────────────────────
// R32 cards are the densest column; every other round's vertical position
// is derived from the midpoint of the two R32-rooted matches that feed it.
const CARD_H = 46;     // height of one match card (px)
const CARD_GAP = 10;   // gap between two cards in the same round (px)
const R32_PAIR_H = CARD_H * 2 + CARD_GAP; // height of one R32 "pair" block
const COL_W = 176;     // column width
const COL_GAP = 56;    // horizontal gap between columns (room for connectors)

// ── Match card component ────────────────────────────────────────────────
function MatchCard({
  match, showMatchNum = false, compact = false,
}: {
  match: BracketMatch;
  showMatchNum?: boolean;
  compact?: boolean;
}) {
  const isTbd = match.home.code === 'TBD' && match.away.code === 'TBD';
  const py = compact ? 'py-1' : 'py-1.5';

  function TeamRow({ slot }: { slot: BracketTeamSlot }) {
    const team = slot.code !== 'TBD' ? getTeamByCode(slot.code) : null;
    const isWinner = match.winner?.code === slot.code && slot.code !== 'TBD';

    return (
      <div className={`flex items-center gap-1.5 px-2.5 ${py} ${isWinner ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}>
        {team ? (
          <>
            <TeamBadge name={team.name} code={team.code} size="sm" showName={!compact} />
            {compact && <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{team.code}</span>}
            {isWinner && <CheckCircle2 className="w-3 h-3 text-brand-500 flex-shrink-0 ml-auto" />}
          </>
        ) : (
          <span className="text-[10px] text-slate-400 italic truncate">{slot.label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border overflow-hidden transition-opacity bg-white dark:bg-surface-dark-100 ${
        isTbd
          ? 'border-dashed border-slate-200/60 dark:border-slate-700/40 opacity-40'
          : match.isActual
            ? 'border-brand-300/60 dark:border-brand-600/40'
            : 'border-slate-200 dark:border-slate-700'
      }`}
      style={{ height: CARD_H }}
    >
      {showMatchNum && (
        <div className="px-2 py-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[8px] text-slate-400">M{match.matchNum}</span>
          {match.isActual && <span className="text-[8px] text-brand-500 flex items-center gap-0.5"><CheckCircle2 className="w-2 h-2" />Actual</span>}
          {!match.isActual && !isTbd && <span className="text-[8px] text-amber-400 flex items-center gap-0.5"><Sparkles className="w-2 h-2" />Predicted</span>}
        </div>
      )}
      <TeamRow slot={match.home} />
      <div className="border-t border-slate-100 dark:border-slate-800/60" />
      <TeamRow slot={match.away} />
    </div>
  );
}

// ── A single round's column: precomputed Y positions per match index ────
interface PositionedMatch {
  match: BracketMatch;
  y: number; // top offset in px, relative to column top
}

// R32: evenly stacked, no offset
function layoutR32(matches: BracketMatch[]): PositionedMatch[] {
  return matches.map((match, i) => ({ match, y: i * (CARD_H + CARD_GAP) }));
}

// Any later round: each match's Y is the midpoint of the Y-centers of its
// two feeder matches from the previous round.
function layoutFromFeeders(
  matches: BracketMatch[],
  feederMap: Record<number, [number, number]>,
  prevLayout: PositionedMatch[]
): PositionedMatch[] {
  const prevByNum = new Map(prevLayout.map(p => [p.match.matchNum, p]));
  return matches.map(match => {
    const [f1, f2] = feederMap[match.matchNum];
    const p1 = prevByNum.get(f1);
    const p2 = prevByNum.get(f2);
    const c1 = p1 ? p1.y + CARD_H / 2 : 0;
    const c2 = p2 ? p2.y + CARD_H / 2 : 0;
    const centerY = (c1 + c2) / 2;
    return { match, y: centerY - CARD_H / 2 };
  });
}

// ── SVG connector: right-angle elbow from two feeder cards into one target card ──
function ConnectorPair({
  topY, bottomY, targetY, colWidth,
}: {
  topY: number; bottomY: number; targetY: number; colWidth: number;
}) {
  const midX = colWidth / 2;
  const cardMidTop = topY + CARD_H / 2;
  const cardMidBottom = bottomY + CARD_H / 2;
  const targetMid = targetY + CARD_H / 2;

  return (
    <>
      {/* top feeder: horizontal stub then vertical drop to elbow */}
      <path
        d={`M 0 ${cardMidTop} H ${midX} V ${targetMid}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-slate-300 dark:text-slate-600"
      />
      {/* bottom feeder: horizontal stub then vertical rise to elbow */}
      <path
        d={`M 0 ${cardMidBottom} H ${midX} V ${targetMid}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-slate-300 dark:text-slate-600"
      />
      {/* final stub into the target card */}
      <path
        d={`M ${midX} ${targetMid} H ${colWidth}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-slate-300 dark:text-slate-600"
      />
    </>
  );
}

// ── A bracket column: positioned match cards + optional connector SVG to the right ──
function BracketColumn({
  title, layout, height, showMatchNum = true, compact = false,
  feederMap, prevLayout,
}: {
  title: string;
  layout: PositionedMatch[];
  height: number;
  showMatchNum?: boolean;
  compact?: boolean;
  // If provided, draws connectors in the gap to the LEFT of this column,
  // joining prevLayout matches into this column's matches.
  feederMap?: Record<number, [number, number]>;
  prevLayout?: PositionedMatch[];
}) {
  return (
    <div className="flex items-start" style={{ gap: COL_GAP }}>
      {/* Connector zone (only rendered when this column has feeders) */}
      {feederMap && prevLayout && (
        <svg
          width={COL_GAP}
          height={height}
          className="flex-shrink-0"
          style={{ marginTop: 24 /* align under column title */ }}
        >
          {layout.map(({ match, y }) => {
            const [f1, f2] = feederMap[match.matchNum] || [];
            const p1 = prevLayout.find(p => p.match.matchNum === f1);
            const p2 = prevLayout.find(p => p.match.matchNum === f2);
            if (!p1 || !p2) return null;
            return (
              <ConnectorPair
                key={match.matchNum}
                topY={p1.y}
                bottomY={p2.y}
                targetY={y}
                colWidth={COL_GAP}
              />
            );
          })}
        </svg>
      )}

      <div style={{ width: COL_W, flexShrink: 0 }}>
        <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
          {title}
        </h4>
        <div className="relative" style={{ height }}>
          {layout.map(({ match, y }) => (
            <div key={match.matchNum} className="absolute left-0 right-0" style={{ top: y }}>
              <MatchCard match={match} showMatchNum={showMatchNum} compact={compact} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Bracket() {
  const sim = useMemo(() => simulateGroupStage(DEFAULT_SIMULATION_RUNS, SIMULATION_SEED), []);
  const { fixtures } = useWC2026Fixtures();
  const { theme } = useTheme();
  const championLogo = theme === 'dark' ? logoDark : logoLight;

  const actualGroupPositions = useMemo(() => deriveActualGroupPositions(fixtures), [fixtures]);
  const actualKnockoutFixtures = useMemo(() => deriveActualKnockoutFixtures(fixtures), [fixtures]);

  const bracket = useMemo(
    () => buildOfficialBracket(sim, actualGroupPositions, undefined, actualKnockoutFixtures),
    [sim, actualGroupPositions, actualKnockoutFixtures]
  );

  const thirdPlace = bracket.thirdPlace;

  const hasActualResults = Object.values(actualKnockoutFixtures).some(f => f.winner);

  // ── Precompute Y positions for every round, cascading from R32 ─────────
  const r32Layout = useMemo(() => layoutR32(bracket.r32), [bracket.r32]);
  const r16Layout = useMemo(
    () => layoutFromFeeders(bracket.r16, R16_FEEDERS, r32Layout),
    [bracket.r16, r32Layout]
  );
  const qfLayout = useMemo(
    () => layoutFromFeeders(bracket.qf, QF_FEEDERS, r16Layout),
    [bracket.qf, r16Layout]
  );
  const sfLayout = useMemo(
    () => layoutFromFeeders(bracket.sf, SF_FEEDERS, qfLayout),
    [bracket.sf, qfLayout]
  );
  const finalY = useMemo(() => {
    const c1 = sfLayout[0].y + CARD_H / 2;
    const c2 = sfLayout[1].y + CARD_H / 2;
    return (c1 + c2) / 2 - CARD_H / 2;
  }, [sfLayout]);
  // Total column height must fit the full R32 stack
  const r32Height = r32Layout.length > 0
    ? r32Layout[r32Layout.length - 1].y + CARD_H
    : 0;

  // Champion probability table from full simulation
  const championCandidates = useMemo(() => {
    return Object.entries(sim.knockout.championProb)
      .map(([code, prob]) => ({ team: getTeamByCode(code), prob }))
      .filter(x => x.team)
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 8);
  }, [sim]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bracket</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official FIFA 2026 bracket seeding — predictions auto-update with real results
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">50K Monte Carlo</span>
          </div>
          {hasActualResults && (
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[11px] font-medium text-green-600 dark:text-green-400">Live results applied</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
          <span>Actual result</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Model prediction</span>
        </div>
      </div>

      {/* Main bracket */}
      <RoundedCard className="!p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-gold-500/5 to-transparent dark:from-gold-500/10">
          <SectionHeader
            title="Knockout Bracket"
            subtitle={`Official seeding · ${sim.simulationRuns.toLocaleString()} simulation runs`}
            icon={<GitBranch className="w-5 h-5" />}
          />
        </div>

        <div className="p-4 sm:p-5 overflow-x-auto">
          <div className="inline-flex items-start">

            {/* R32 — 16 matches */}
            <BracketColumn
              title="Round of 32"
              layout={r32Layout}
              height={r32Height}
              showMatchNum
            />

            {/* R16 — 8 matches, connected from R32 */}
            <BracketColumn
              title="Round of 16"
              layout={r16Layout}
              height={r32Height}
              showMatchNum
              feederMap={R16_FEEDERS}
              prevLayout={r32Layout}
            />

            {/* QF — 4 matches, connected from R16 */}
            <BracketColumn
              title="Quarter-Finals"
              layout={qfLayout}
              height={r32Height}
              showMatchNum
              feederMap={QF_FEEDERS}
              prevLayout={r16Layout}
            />

            {/* SF — 2 matches, connected from QF */}
            <BracketColumn
              title="Semi-Finals"
              layout={sfLayout}
              height={r32Height}
              showMatchNum
              feederMap={SF_FEEDERS}
              prevLayout={qfLayout}
            />

            {/* Final + Third place, connected from SF */}
            <div className="flex items-start" style={{ gap: COL_GAP }}>
              <svg width={COL_GAP} height={r32Height} className="flex-shrink-0" style={{ marginTop: 24 }}>
                <ConnectorPair
                  topY={sfLayout[0].y}
                  bottomY={sfLayout[1].y}
                  targetY={finalY}
                  colWidth={COL_GAP}
                />
              </svg>

              <div style={{ width: COL_W, flexShrink: 0 }}>
                <div style={{ position: 'relative', height: r32Height }}>
                  {/* Final */}
                  <div className="absolute left-0 right-0" style={{ top: finalY - 24 }}>
                    <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">Final</h4>
                    <MatchCard match={bracket.final} showMatchNum />

                    {/* Champion */}
                    <div className="mt-5 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-glow-gold">
                        <img src={championLogo} alt="WC 2026" className="w-full h-full object-contain" />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-gold-600 dark:text-gold-400">Champion</p>
                      {bracket.final.winner && bracket.final.winner.code !== 'TBD' ? (
                        <div className="mt-1.5 flex flex-col items-center gap-1">
                          <TeamBadge
                            name={getTeamByCode(bracket.final.winner.code)?.name || bracket.final.winner.code}
                            code={bracket.final.winner.code}
                            size="sm"
                          />
                          {bracket.final.isActual
                            ? <span className="text-[9px] text-brand-500">✓ Confirmed</span>
                            : <span className="text-[9px] text-amber-400">~ Predicted</span>
                          }
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">TBD</p>
                      )}
                    </div>
                  </div>

                  {/* Third place — positioned near the bottom, below semis */}
                  <div className="absolute left-0 right-0" style={{ top: r32Height - CARD_H - 24 }}>
                    <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                      Third Place
                    </h4>
                    <MatchCard match={thirdPlace} showMatchNum />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </RoundedCard>

      {/* Champion probability */}
      <RoundedCard hover={false}>
        <SectionHeader
          title="Champion Probability"
          subtitle="Top 8 projected winners — from full knockout bracket simulation"
          icon={<Trophy className="w-5 h-5" />}
        />
        <div className="mt-4 space-y-3">
          {championCandidates.map(({ team, prob }, i) => team && (
            <div key={team.code} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400'
                : i < 3 ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>{i + 1}</span>
              <TeamBadge name={team.name} code={team.code} size="sm" />
              <span className="text-xs text-slate-400">Elo {team.elo}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    i === 0 ? 'bg-gold-500' : i < 3 ? 'bg-brand-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(prob, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-semibold w-14 text-right ${
                i === 0 ? 'text-gold-600 dark:text-gold-400'
                : i < 3 ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500'
              }`}>{prob.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </RoundedCard>

      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 py-2">
        <span>Model: {sim.modelVersion}</span>
        <span>|</span>
        <span>Runs: {sim.simulationRuns.toLocaleString()}</span>
        <span>|</span>
        <span>Seeding: Official FIFA 2026 (M73-M104)</span>
      </div>
    </div>
  );
}
