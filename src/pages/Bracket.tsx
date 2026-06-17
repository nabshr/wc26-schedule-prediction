import { GitBranch, Trophy, Cpu, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';
import { buildOfficialBracket, type BracketMatch, type BracketTeamSlot } from '../lib/bracketSeeding';
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
function deriveActualKnockoutResults(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures']
): Record<string, string> {
  const results: Record<string, string> = {};
  const ko = fixtures.filter(f =>
    f.status === 'completed' && f.stage !== 'group' && f.winnerCode
  ).sort((a, b) => (a.date + a.timeUTC).localeCompare(b.date + b.timeUTC));

  const byStage: Record<string, typeof ko> = {};
  for (const f of ko) {
    if (!byStage[f.stage]) byStage[f.stage] = [];
    byStage[f.stage].push(f);
  }

  const STAGE_KEY: Record<string, string> = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: 'Third', final: 'Final' };
  // Match numbers for each stage (in official order)
  const STAGE_MATCH_NUMS: Record<string, number[]> = {
    r32: [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88],
    r16: [89,90,91,92,93,94,95,96],
    qf:  [97,98,99,100],
    sf:  [101,102],
    third: [103],
    final: [104],
  };

  for (const [stage, matches] of Object.entries(byStage)) {
    const roundKey = STAGE_KEY[stage];
    if (!roundKey) continue;
    const matchNums = STAGE_MATCH_NUMS[stage] || [];
    matches.forEach((f, i) => {
      const winnerCode = f.winnerCode === 'home' ? f.home
        : f.winnerCode === 'away' ? f.away
        : null;
      if (!winnerCode || winnerCode === 'draw') return;
      const mNum = matchNums[i];
      if (mNum) results[`${roundKey}-${mNum}`] = winnerCode;
    });
  }
  return results;
}

// ── Match card component ────────────────────────────────────────────────
function MatchCard({
  match, size = 'sm', showMatchNum = false,
}: {
  match: BracketMatch;
  size?: 'xs' | 'sm' | 'md';
  showMatchNum?: boolean;
}) {
  const py = size === 'xs' ? 'py-1' : size === 'sm' ? 'py-1.5' : 'py-2';
  const isTbd = match.home.code === 'TBD' && match.away.code === 'TBD';

  function TeamRow({ slot }: { slot: BracketTeamSlot }) {
    const team = slot.code !== 'TBD' ? getTeamByCode(slot.code) : null;
    const isWinner = match.winner?.code === slot.code && slot.code !== 'TBD';

    return (
      <div className={`flex items-center gap-1.5 px-2.5 ${py} ${isWinner ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}>
        {team ? (
          <>
            <TeamBadge name={team.name} code={team.code} size="sm" />
            {isWinner && <CheckCircle2 className="w-3 h-3 text-brand-500 flex-shrink-0 ml-auto" />}
          </>
        ) : (
          <span className="text-[10px] text-slate-400 italic truncate">{slot.label}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-md border overflow-hidden transition-opacity ${
      isTbd
        ? 'border-dashed border-slate-200/60 dark:border-slate-700/40 opacity-40'
        : match.isActual
          ? 'border-brand-300/60 dark:border-brand-600/40'
          : 'border-slate-200 dark:border-slate-700'
    } bg-white dark:bg-surface-dark-100`}>
      {showMatchNum && (
        <div className="px-2.5 py-0.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-[9px] text-slate-400">M{match.matchNum}</span>
          {match.isActual && <span className="ml-1 text-[9px] text-brand-500">✓ Actual</span>}
          {!match.isActual && !isTbd && <span className="ml-1 text-[9px] text-amber-400">~ Predicted</span>}
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
  title, matches, size = 'sm', showMatchNum = false,
  topOffset = 0,
}: {
  title: string; matches: BracketMatch[]; size?: 'xs' | 'sm' | 'md';
  showMatchNum?: boolean; topOffset?: number;
}) {
  const halfLen = Math.ceil(matches.length / 2);
  const topHalf = matches.slice(0, halfLen);
  const bottomHalf = matches.slice(halfLen);

  return (
    <div className="flex-1 min-w-[152px]">
      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
        {title}
      </h4>
      <div className="flex flex-col gap-1.5">
        {topHalf.map((m, i) => (
          <div key={m.matchNum} style={{ marginTop: i === 0 ? topOffset : 0 }}>
            <MatchCard match={m} size={size} showMatchNum={showMatchNum} />
          </div>
        ))}
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-1" />
        {bottomHalf.map((m, i) => (
          <div key={m.matchNum} style={{ marginTop: i === 0 ? topOffset : 0 }}>
            <MatchCard match={m} size={size} showMatchNum={showMatchNum} />
          </div>
        ))}
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
  const actualKnockoutResults = useMemo(() => deriveActualKnockoutResults(fixtures), [fixtures]);

  const bracket = useMemo(
    () => buildOfficialBracket(sim, actualGroupPositions, actualKnockoutResults),
    [sim, actualGroupPositions, actualKnockoutResults]
  );

  const thirdPlace = bracket.thirdPlace;


  const hasActualResults = Object.keys(actualKnockoutResults).length > 0;

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
          <div className="min-w-[920px] flex items-start gap-2">

            {/* R32 — 16 matches */}
            <RoundColumn
              title="Round of 32"
              matches={bracket.r32}
              size="xs"
              showMatchNum={true}
              topOffset={0}
            />

            {/* R16 — 8 matches */}
            <RoundColumn
              title="Round of 16"
              matches={bracket.r16}
              size="sm"
              showMatchNum={true}
              topOffset={20}
            />

            {/* QF — 4 matches */}
            <RoundColumn
              title="Quarter-Finals"
              matches={bracket.qf}
              size="sm"
              showMatchNum={true}
              topOffset={52}
            />

            {/* SF — 2 matches */}
            <div className="flex-1 min-w-[152px]">
              <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">Semi-Finals</h4>
              <div className="flex flex-col gap-2">
                <div style={{ marginTop: 120 }}>
                  <MatchCard match={bracket.sf[0]} size="md" showMatchNum={true} />
                </div>
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-1" />
                <div style={{ marginTop: 120 }}>
                  <MatchCard match={bracket.sf[1]} size="md" showMatchNum={true} />
                </div>
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                Third Place
              </h4>
              <MatchCard match={thirdPlace} size="md" showMatchNum={true} />
            </div>

            {/* Final + Champion */}
            <div className="flex flex-col items-center min-w-[160px]" style={{ marginTop: 290 }}>
              <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Final</h4>
              <div className="w-full">
                <MatchCard match={bracket.final} size="md" showMatchNum={true} />
              </div>

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
