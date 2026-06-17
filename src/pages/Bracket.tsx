import { GitBranch, Trophy, Cpu, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { GROUP_NAMES, getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage, buildResolvedBracket, R32_MATCHUPS } from '../lib/prediction';
import { useWC2026Fixtures } from '../lib/useWC2026Fixtures';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/wc26_light.png';
import logoDark from '../assets/wc26_dark.png';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED } from '../lib/simulationConfig';

// ── Derive actual group positions from real fixture results ─────────────
function deriveActualGroupPositions(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures']
): Record<string, string[]> | undefined {
  const standings: Record<string, Record<string, { pts: number; gd: number; gf: number }>> = {};

  for (const f of fixtures) {
    if (f.stage !== 'group') continue;
    if (f.status !== 'completed' || f.homeScore == null || f.awayScore == null) continue;
    const g = f.group;
    if (!g) continue;
    if (!standings[g]) standings[g] = {};
    if (!standings[g][f.home]) standings[g][f.home] = { pts: 0, gd: 0, gf: 0 };
    if (!standings[g][f.away]) standings[g][f.away] = { pts: 0, gd: 0, gf: 0 };
    const h = standings[g][f.home];
    const a = standings[g][f.away];
    h.gf += f.homeScore; h.gd += f.homeScore - f.awayScore;
    a.gf += f.awayScore; a.gd += f.awayScore - f.homeScore;
    if (f.homeScore > f.awayScore) { h.pts += 3; }
    else if (f.homeScore === f.awayScore) { h.pts += 1; a.pts += 1; }
    else { a.pts += 3; }
  }

  // Only return positions for fully-completed groups (all 6 matches played)
  const result: Record<string, string[]> = {};
  for (const g of GROUP_NAMES) {
    const teams = Object.entries(standings[g] || {});
    if (teams.length < 4) continue; // group not done
    const sorted = teams
      .sort((a, b) => b[1].pts - a[1].pts || b[1].gd - a[1].gd || b[1].gf - a[1].gf)
      .map(([code]) => code);
    result[g] = sorted;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ── Derive actual knockout results from real fixture data ───────────────
function deriveActualKnockoutResults(
  fixtures: ReturnType<typeof useWC2026Fixtures>['fixtures']
): Record<string, string> {
  const results: Record<string, string> = {};
  const knockoutFixtures = fixtures.filter(
    f => f.status === 'completed' && f.stage !== 'group' && f.winnerCode
  );
  for (const f of knockoutFixtures) {
    const winnerCode = f.winnerCode === 'home' ? f.home
      : f.winnerCode === 'away' ? f.away
      : f.winnerCode || null;
    if (!winnerCode || winnerCode === 'draw') continue;

    // Map fixture stage to bracket key
    let roundKey = '';
    if (f.stage === 'r32') roundKey = 'R32';
    else if (f.stage === 'r16') roundKey = 'R16';
    else if (f.stage === 'qf') roundKey = 'QF';
    else if (f.stage === 'sf') roundKey = 'SF';
    else if (f.stage === 'final') roundKey = 'Final';

    if (!roundKey) continue;

    // Find the match index within this round based on team codes
    const matchIdx = knockoutFixtures
      .filter(x => x.stage === f.stage)
      .sort((a, b) => (a.date + a.timeUTC).localeCompare(b.date + b.timeUTC))
      .indexOf(f);

    if (matchIdx >= 0) results[`${roundKey}-${matchIdx}`] = winnerCode;
  }
  return results;
}

// ── Match card ─────────────────────────────────────────────────────────
interface MatchSlot {
  home: string; away: string;
  winner: string | null;
  isActual: boolean;
}

function BracketMatchCard({ match, size = 'md' }: { match: MatchSlot; size?: 'sm' | 'md' }) {
  const homeTeam = getTeamByCode(match.home);
  const awayTeam = getTeamByCode(match.away);
  const isTbd = match.home === 'TBD' || match.away === 'TBD';
  const py = size === 'sm' ? 'py-1.5' : 'py-2';

  function Row({ code, team, isWinner }: { code: string; team: ReturnType<typeof getTeamByCode>; isWinner: boolean }) {
    return (
      <div className={`flex items-center justify-between px-3 ${py} ${isWinner ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''}`}>
        {team ? (
          <div className="flex items-center gap-1.5">
            <TeamBadge name={team.name} code={team.code} size="sm" />
            {isWinner && (
              <CheckCircle2 className="w-3 h-3 text-brand-500 ml-1 flex-shrink-0" />
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">{code === 'TBD' ? 'TBD' : code}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${isTbd ? 'border-dashed border-slate-200 dark:border-slate-700 opacity-50' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-surface-dark-100 overflow-hidden`}>
      <Row code={match.home} team={homeTeam} isWinner={match.winner === match.home} />
      <div className="border-t border-slate-100 dark:border-slate-800" />
      <Row code={match.away} team={awayTeam} isWinner={match.winner === match.away} />
    </div>
  );
}

// ── Column header with badge ────────────────────────────────────────────
function RoundHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="text-center mb-3">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h4>
      <span className="text-[10px] text-slate-400">{count} matches</span>
    </div>
  );
}

export default function Bracket() {
  const sim = useMemo(() => simulateGroupStage(DEFAULT_SIMULATION_RUNS, SIMULATION_SEED), []);
  const { fixtures } = useWC2026Fixtures();
  const { theme } = useTheme();
  const championLogo = theme === 'dark' ? logoDark : logoLight;

  // Derive real results to override predictions
  const actualGroupPositions = useMemo(() => deriveActualGroupPositions(fixtures), [fixtures]);
  const actualKnockoutResults = useMemo(() => deriveActualKnockoutResults(fixtures), [fixtures]);

  const bracket = useMemo(
    () => buildResolvedBracket(sim, actualKnockoutResults, actualGroupPositions),
    [sim, actualKnockoutResults, actualGroupPositions]
  );

  // Champion probability table
  const championCandidates = useMemo(() => {
    return Object.entries(sim.knockout.championProb)
      .map(([code, prob]) => ({ team: getTeamByCode(code), prob }))
      .filter(x => x.team)
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 8);
  }, [sim]);

  const hasActualResults = Object.keys(actualKnockoutResults).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bracket</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projected knockout stage — real results auto-override predictions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">50K Monte Carlo</span>
          </div>
          {hasActualResults && (
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[11px] font-medium text-green-600 dark:text-green-400">Real results applied</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
          <span>Actual result</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Predicted by model</span>
        </div>
      </div>

      <RoundedCard className="!p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-gold-500/5 to-transparent dark:from-gold-500/10">
          <SectionHeader title="Knockout Bracket" subtitle={`Projected from ${sim.simulationRuns.toLocaleString()} simulation runs`} icon={<GitBranch className="w-5 h-5" />} />
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[1100px] flex items-start gap-3">

            {/* R32 */}
            <div className="flex-1 min-w-[160px]">
              <RoundHeader title="Round of 32" count={16} />
              <div className="space-y-1.5">
                {bracket.r32.slice(0, 8).map((m, i) => (
                  <BracketMatchCard key={`r32-t${i}`} match={m} size="sm" />
                ))}
                <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                {bracket.r32.slice(8).map((m, i) => (
                  <BracketMatchCard key={`r32-b${i}`} match={m} size="sm" />
                ))}
              </div>
            </div>

            {/* R16 */}
            <div className="flex-1 min-w-[160px]">
              <RoundHeader title="Round of 16" count={8} />
              <div className="space-y-3">
                {bracket.r16.slice(0, 4).map((m, i) => (
                  <div key={`r16-t${i}`} className="flex flex-col justify-center" style={{ minHeight: '64px', marginTop: i === 0 ? '18px' : '18px' }}>
                    <BracketMatchCard match={m} size="sm" />
                    {!m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><Sparkles className="w-2.5 h-2.5 text-amber-400" /><span className="text-[9px] text-amber-500">Predicted</span></div>}
                    {m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><CheckCircle2 className="w-2.5 h-2.5 text-brand-500" /><span className="text-[9px] text-brand-500">Actual</span></div>}
                  </div>
                ))}
                <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                {bracket.r16.slice(4).map((m, i) => (
                  <div key={`r16-b${i}`} className="flex flex-col justify-center" style={{ minHeight: '64px', marginTop: '18px' }}>
                    <BracketMatchCard match={m} size="sm" />
                    {!m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><Sparkles className="w-2.5 h-2.5 text-amber-400" /><span className="text-[9px] text-amber-500">Predicted</span></div>}
                    {m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><CheckCircle2 className="w-2.5 h-2.5 text-brand-500" /><span className="text-[9px] text-brand-500">Actual</span></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* QF */}
            <div className="flex-1 min-w-[160px]">
              <RoundHeader title="Quarter-Finals" count={4} />
              <div className="space-y-6">
                {bracket.qf.map((m, i) => (
                  <div key={`qf-${i}`} className="flex flex-col justify-center" style={{ marginTop: i === 0 ? '54px' : '54px' }}>
                    <BracketMatchCard match={m} />
                    {!m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><Sparkles className="w-2.5 h-2.5 text-amber-400" /><span className="text-[9px] text-amber-500">Predicted</span></div>}
                    {m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><CheckCircle2 className="w-2.5 h-2.5 text-brand-500" /><span className="text-[9px] text-brand-500">Actual</span></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* SF */}
            <div className="flex-1 min-w-[160px]">
              <RoundHeader title="Semi-Finals" count={2} />
              <div className="space-y-12">
                {bracket.sf.map((m, i) => (
                  <div key={`sf-${i}`} className="flex flex-col justify-center" style={{ marginTop: i === 0 ? '140px' : '140px' }}>
                    <BracketMatchCard match={m} />
                    {!m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><Sparkles className="w-2.5 h-2.5 text-amber-400" /><span className="text-[9px] text-amber-500">Predicted</span></div>}
                    {m.isActual && <div className="flex items-center gap-1 mt-0.5 px-1"><CheckCircle2 className="w-2.5 h-2.5 text-brand-500" /><span className="text-[9px] text-brand-500">Actual</span></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Final + Champion */}
            <div className="flex flex-col items-center min-w-[160px]" style={{ marginTop: '320px' }}>
              <div className="w-full mb-2">
                <div className="text-center mb-1">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Final</h4>
                </div>
                <BracketMatchCard match={bracket.final} />
                {!bracket.final.isActual && <div className="flex items-center gap-1 mt-0.5 px-1 justify-center"><Sparkles className="w-2.5 h-2.5 text-amber-400" /><span className="text-[9px] text-amber-500">Predicted</span></div>}
                {bracket.final.isActual && <div className="flex items-center gap-1 mt-0.5 px-1 justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-brand-500" /><span className="text-[9px] text-brand-500">Actual</span></div>}
              </div>

              {/* Champion */}
              <div className="mt-4 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-glow-gold">
                  <img src={championLogo} alt="FIFA World Cup 2026 logo" className="w-full h-full object-contain" />
                </div>
                <p className="mt-2 text-xs font-semibold text-gold-600 dark:text-gold-400">Champion</p>
                {bracket.final.winner && bracket.final.winner !== 'TBD' ? (
                  <div className="mt-1">
                    <TeamBadge
                      name={getTeamByCode(bracket.final.winner)?.name || bracket.final.winner}
                      code={bracket.final.winner}
                      size="sm"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">TBD</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </RoundedCard>

      {/* Champion probability table */}
      <RoundedCard hover={false}>
        <SectionHeader title="Champion Probability" subtitle="Top 8 projected tournament winners (from full knockout simulation)" icon={<Trophy className="w-5 h-5" />} />
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
                i === 0 ? 'text-gold-600 dark:text-gold-400' : i < 3 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
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
        <span>Real results override predictions automatically</span>
      </div>
    </div>
  );
}
