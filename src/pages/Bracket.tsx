import { GitBranch, Trophy, Cpu, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';
import { buildOfficialBracket, type BracketMatch, type BracketTeamSlot, type RealKnockoutFixture } from '../lib/bracketSeeding';
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
function deriveActualKnockoutFixtures(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures'],
  actualGroupPositions?: Record<string, string[]>
): Record<number, RealKnockoutFixture> {
  const result: Record<number, RealKnockoutFixture> = {};

  const R32_SEEDING = [
    { matchNum: 73, home: '2A', away: '2B' },
    { matchNum: 74, home: '1E', away: '3ABCDF' },
    { matchNum: 75, home: '1F', away: '2C' },
    { matchNum: 76, home: '1C', away: '2F' },
    { matchNum: 77, home: '1I', away: '3CDFGH' },
    { matchNum: 78, home: '2E', away: '2I' },
    { matchNum: 79, home: '1A', away: '3CEFHI' },
    { matchNum: 80, home: '1L', away: '3EHIJK' },
    { matchNum: 81, home: '1D', away: '3BEFIJ' },
    { matchNum: 82, home: '1G', away: '3AEHIJ' },
    { matchNum: 83, home: '2K', away: '2L' },
    { matchNum: 84, home: '1H', away: '2J' },
    { matchNum: 85, home: '1B', away: '3EFGIJ' },
    { matchNum: 86, home: '1J', away: '2H' },
    { matchNum: 87, home: '1K', away: '3DEIJL' },
    { matchNum: 88, home: '2D', away: '2G' },
  ] as const;

  const R16_SEEDING = [
    { matchNum: 89, from: [74, 77] },
    { matchNum: 90, from: [73, 75] },
    { matchNum: 91, from: [76, 78] },
    { matchNum: 92, from: [79, 80] },
    { matchNum: 93, from: [83, 84] },
    { matchNum: 94, from: [81, 82] },
    { matchNum: 95, from: [86, 88] },
    { matchNum: 96, from: [85, 87] },
  ] as const;

  const QF_SEEDING = [
    { matchNum: 97, from: [89, 90] },
    { matchNum: 98, from: [93, 94] },
    { matchNum: 99, from: [91, 92] },
    { matchNum: 100, from: [95, 96] },
  ] as const;

  const SF_SEEDING = [
    { matchNum: 101, from: [97, 98] },
    { matchNum: 102, from: [99, 100] },
  ] as const;

  const getWinner = (f: typeof fixtures[number]): string | undefined => {
    if (f.status !== 'completed' || !f.winnerCode) return undefined;
    if (f.winnerCode === 'home') return f.home;
    if (f.winnerCode === 'away') return f.away;
    return undefined;
  };

  const teamSlotMap = new Map<string, string>();

  if (actualGroupPositions) {
    for (const [group, positions] of Object.entries(actualGroupPositions)) {
      if (positions[0]) teamSlotMap.set(positions[0], `1${group}`);
      if (positions[1]) teamSlotMap.set(positions[1], `2${group}`);
      if (positions[2]) teamSlotMap.set(positions[2], `3${group}`);
    }
  }

  const slotMatchesTeam = (slot: string, teamCode: string): boolean => {
    const teamSlot = teamSlotMap.get(teamCode);
    if (!teamSlot) return false;

    if (slot.startsWith('1') || slot.startsWith('2')) {
      return slot === teamSlot;
    }

    if (slot.startsWith('3')) {
      return teamSlot.startsWith('3') && slot.slice(1).includes(teamSlot.slice(1));
    }

    return false;
  };

  const samePair = (
    fixtureHome: string,
    fixtureAway: string,
    slotHome: string,
    slotAway: string
  ): boolean => {
    return (
      (slotMatchesTeam(slotHome, fixtureHome) && slotMatchesTeam(slotAway, fixtureAway)) ||
      (slotMatchesTeam(slotHome, fixtureAway) && slotMatchesTeam(slotAway, fixtureHome))
    );
  };

  const r32Fixtures = fixtures.filter(
    f => f.stage === 'r32' && f.home && f.home !== 'TBD' && f.away && f.away !== 'TBD'
  );

  const usedFixtureIds = new Set<string>();

  for (const f of r32Fixtures) {
    const seed = R32_SEEDING.find(
      s =>
        !result[s.matchNum] &&
        samePair(f.home, f.away, s.home, s.away)
    );

    if (!seed) continue;

    result[seed.matchNum] = {
      home: f.home,
      away: f.away,
      winner: getWinner(f),
    };

    usedFixtureIds.add(`${f.stage}-${f.home}-${f.away}-${f.date}-${f.timeUTC}`);
  }

  const assignByPredecessors = (
    stage: 'r16' | 'qf' | 'sf',
    seeding: ReadonlyArray<{ matchNum: number; from: readonly [number, number] }>
  ) => {
    const stageFixtures = fixtures.filter(
      f => f.stage === stage && f.home && f.home !== 'TBD' && f.away && f.away !== 'TBD'
    );

    for (const f of stageFixtures) {
      const key = `${f.stage}-${f.home}-${f.away}-${f.date}-${f.timeUTC}`;
      if (usedFixtureIds.has(key)) continue;

      const match = seeding.find(s => {
        if (result[s.matchNum]) return false;

        const w1 = result[s.from[0]]?.winner;
        const w2 = result[s.from[1]]?.winner;
        if (!w1 || !w2) return false;

        const teams = [f.home, f.away];
        return teams.includes(w1) && teams.includes(w2);
      });

      if (!match) continue;

      result[match.matchNum] = {
        home: f.home,
        away: f.away,
        winner: getWinner(f),
      };

      usedFixtureIds.add(key);
    }
  };

  assignByPredecessors('r16', R16_SEEDING);
  assignByPredecessors('qf', QF_SEEDING);
  assignByPredecessors('sf', SF_SEEDING);

  const thirdFixture = fixtures.find(
    f => f.stage === 'third' && f.home && f.home !== 'TBD' && f.away && f.away !== 'TBD'
  );
  if (thirdFixture) {
    result[103] = {
      home: thirdFixture.home,
      away: thirdFixture.away,
      winner: getWinner(thirdFixture),
    };
  }

  const finalFixture = fixtures.find(
    f => f.stage === 'final' && f.home && f.home !== 'TBD' && f.away && f.away !== 'TBD'
  );
  if (finalFixture) {
    result[104] = {
      home: finalFixture.home,
      away: finalFixture.away,
      winner: getWinner(finalFixture),
    };
  }

  return result;
}

// ── Match card component ────────────────────────────────────────────────
function MatchCard({
  match,
  size = 'sm',
  showMatchNum = false,
}: {
  match: BracketMatch;
  size?: 'xs' | 'sm' | 'md';
  showMatchNum?: boolean;
}) {
  const py = size === 'xs' ? 'py-1' : size === 'sm' ? 'py-1.5' : 'py-2';
  const isTbd = match.home.code === 'TBD' && match.away.code === 'TBD';

  const hasActualTeams =
    (match.home.code !== 'TBD' && match.home.isActual) ||
    (match.away.code !== 'TBD' && match.away.isActual);

  const hasActualWinner = !!match.winner?.isActual || match.isActual;
  const isCompletedActual = hasActualWinner;
  const isPredicted = !isTbd && !isCompletedActual;

  function TeamRow({ slot }: { slot: BracketTeamSlot }) {
    const team = slot.code !== 'TBD' ? getTeamByCode(slot.code) : null;
    const isWinner = match.winner?.code === slot.code && slot.code !== 'TBD';

    return (
      <div
        className={`flex items-center gap-2 px-2.5 ${py} ${
          isWinner
            ? isCompletedActual
              ? 'bg-emerald-500/10 dark:bg-emerald-500/12'
              : 'bg-brand-50/70 dark:bg-brand-500/10'
            : ''
        }`}
      >
        {team ? (
          <>
            <TeamBadge name={team.name} code={team.code} size="sm" />
            {isWinner && isCompletedActual && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 ml-auto" />
            )}
            {isWinner && !isCompletedActual && (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-auto" />
            )}
          </>
        ) : (
          <span className="text-[10px] text-slate-400 italic truncate">{slot.label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border overflow-hidden shadow-sm backdrop-blur-sm ${
        isTbd
          ? 'border-dashed border-slate-200/60 dark:border-slate-700/40 opacity-40'
          : isCompletedActual
            ? 'border-emerald-400/40 dark:border-emerald-500/30 shadow-emerald-500/5'
            : isPredicted
              ? 'border-slate-200 dark:border-slate-700 shadow-black/5'
              : 'border-slate-200 dark:border-slate-700'
      } bg-white/95 dark:bg-surface-dark-100/95`}
    >
      {showMatchNum && (
        <div className="px-2.5 py-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/55 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              M{match.matchNum}
            </span>

            {isCompletedActual && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Actual
              </span>
            )}

            {!isCompletedActual && !isTbd && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-500 dark:text-amber-400">
                <Sparkles className="w-3 h-3" />
                Predicted
              </span>
            )}
          </div>

          {hasActualTeams && !isCompletedActual && (
            <span className="text-[8px] uppercase tracking-wider text-sky-500/90 dark:text-sky-400/90">
              Live slot
            </span>
          )}
        </div>
      )}

      <TeamRow slot={match.home} />
      <div className="border-t border-slate-100 dark:border-slate-800/60" />
      <TeamRow slot={match.away} />
    </div>
  );
}

// ── Round column ────────────────────────────────────────────────────────
function RoundColumn({
  title,
  matches,
  size = 'sm',
  showMatchNum = false,
  topOffset = 0,
}: {
  title: string;
  matches: BracketMatch[];
  size?: 'xs' | 'sm' | 'md';
  showMatchNum?: boolean;
  topOffset?: number;
}) {
  const halfLen = Math.ceil(matches.length / 2);
  const topHalf = matches.slice(0, halfLen);
  const bottomHalf = matches.slice(halfLen);

  return (
    <div className="flex-1 min-w-[172px]">
      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3 text-center">
        {title}
      </h4>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          {topHalf.map((m, i) => (
            <div key={m.matchNum} style={{ marginTop: i === 0 ? topOffset : 0 }}>
              <MatchCard match={m} size={size} showMatchNum={showMatchNum} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {bottomHalf.map((m, i) => (
            <div key={m.matchNum} style={{ marginTop: i === 0 ? topOffset : 0 }}>
              <MatchCard match={m} size={size} showMatchNum={showMatchNum} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketConnectors({
  top,
  pairCount,
  pairHeight,
  pairGap,
  x = 0,
  width = 24,
}: {
  top: number;
  pairCount: number;
  pairHeight: number;
  pairGap: number;
  x?: number;
  width?: number;
}) {
  const lineClass = 'bg-slate-300/80 dark:bg-slate-600/80';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top,
        width: width * 2,
        height: pairCount * pairHeight + (pairCount - 1) * pairGap,
      }}
    >
      {Array.from({ length: pairCount }).map((_, i) => {
        const pairTop = i * (pairHeight + pairGap);
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: pairTop,
              left: 0,
              width: width * 2,
              height: pairHeight,
            }}
          >
            {/* top horizontal */}
            <div
              className={`absolute ${lineClass}`}
              style={{ left: 0, top: pairHeight * 0.25, width, height: 1 }}
            />
            {/* bottom horizontal */}
            <div
              className={`absolute ${lineClass}`}
              style={{ left: 0, top: pairHeight * 0.75, width, height: 1 }}
            />
            {/* vertical join */}
            <div
              className={`absolute ${lineClass}`}
              style={{ left: width, top: pairHeight * 0.25, width: 1, height: pairHeight * 0.5 }}
            />
            {/* output horizontal */}
            <div
              className={`absolute ${lineClass}`}
              style={{ left: width, top: pairHeight * 0.5, width, height: 1 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Bracket() {
  const sim = useMemo(() => simulateGroupStage(DEFAULT_SIMULATION_RUNS, SIMULATION_SEED), []);
  const { fixtures } = useWC2026Fixtures();
  const { theme } = useTheme();
  const championLogo = theme === 'dark' ? logoDark : logoLight;

  const actualGroupPositions = useMemo(() => deriveActualGroupPositions(fixtures), [fixtures]);
  const actualKnockoutFixtures = useMemo(
    () => deriveActualKnockoutFixtures(fixtures, actualGroupPositions),
    [fixtures, actualGroupPositions]
  );

  const bracket = useMemo(
    () => buildOfficialBracket(sim, actualGroupPositions, undefined, actualKnockoutFixtures),
    [sim, actualGroupPositions, actualKnockoutFixtures]
  );

  const thirdPlace = bracket.thirdPlace;

  const hasActualResults = Object.values(actualKnockoutFixtures).some(f => f.winner);

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
      <div className="flex items-center gap-5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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

        <div className="p-5 sm:p-6 overflow-x-auto bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_35%)]">
          <div className="min-w-[1280px] relative">
            <div className="flex items-start gap-10 relative">
              {/* R32 */}
              <div className="relative">
                <RoundColumn
                  title="Round of 32"
                  matches={bracket.r32}
                  size="xs"
                  showMatchNum={true}
                  topOffset={0}
                />
              </div>

              {/* Connectors: R32 -> R16 */}
              <div className="relative w-10 h-[980px]">
                <BracketConnectors top={34} pairCount={4} pairHeight={154} pairGap={34} />
                <BracketConnectors top={538} pairCount={4} pairHeight={154} pairGap={34} />
              </div>

              {/* R16 */}
              <div className="relative">
                <RoundColumn
                  title="Round of 16"
                  matches={bracket.r16}
                  size="sm"
                  showMatchNum={true}
                  topOffset={20}
                />
              </div>

              {/* Connectors: R16 -> QF */}
              <div className="relative w-10 h-[980px]">
                <BracketConnectors top={76} pairCount={2} pairHeight={252} pairGap={70} />
                <BracketConnectors top={580} pairCount={2} pairHeight={252} pairGap={70} />
              </div>

              {/* QF */}
              <div className="relative">
                <RoundColumn
                  title="Quarter-Finals"
                  matches={bracket.qf}
                  size="sm"
                  showMatchNum={true}
                  topOffset={56}
                />
              </div>

              {/* Connectors: QF -> SF */}
              <div className="relative w-10 h-[980px]">
                <BracketConnectors top={138} pairCount={1} pairHeight={340} pairGap={0} />
                <BracketConnectors top={640} pairCount={1} pairHeight={340} pairGap={0} />
              </div>

              {/* SF */}
              <div className="flex-1 min-w-[172px]">
                <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3 text-center">
                  Semi-Finals
                </h4>
                <div className="flex flex-col gap-2">
                  <div style={{ marginTop: 120 }}>
                    <MatchCard match={bracket.sf[0]} size="md" showMatchNum={true} />
                  </div>
                  <div style={{ marginTop: 210 }}>
                    <MatchCard match={bracket.sf[1]} size="md" showMatchNum={true} />
                  </div>
                </div>
              </div>

              {/* Third place */}
              <div className="flex flex-col items-center min-w-[180px]" style={{ marginTop: 620 }}>
                <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-2 text-center">
                  Third Place
                </h4>
                <MatchCard match={thirdPlace} size="md" showMatchNum={true} />
              </div>

              {/* Final + Champion */}
              <div className="flex flex-col items-center min-w-[180px]" style={{ marginTop: 290 }}>
                <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-2">
                  Final
                </h4>
                <div className="w-full">
                  <MatchCard match={bracket.final} size="md" showMatchNum={true} />
                </div>

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
