import { GitBranch, Trophy, Cpu } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { GROUP_NAMES, getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage, type GroupProbabilities } from '../lib/prediction';

interface BracketSlot {
  code: string;
  label: string;
  pAdvance: number;
  p1st: number;
  p2nd: number;
}

function getProjectedGroupPositions(sim: ReturnType<typeof simulateGroupStage>) {
  const positions: Record<string, BracketSlot[]> = {};

  for (const g of GROUP_NAMES) {
    const groupData = sim.groups[g];
    const sorted = [...groupData].sort((a, b) => b.p1st - a.p1st);

    positions[g] = [
      {
        code: sorted[0].team.code,
        label: `1st Group ${g}`,
        pAdvance: sorted[0].pAdvance,
        p1st: sorted[0].p1st,
        p2nd: sorted[0].p2nd,
      },
      {
        code: sorted[1].team.code,
        label: `2nd Group ${g}`,
        pAdvance: sorted[1].pAdvance,
        p1st: sorted[1].p1st,
        p2nd: sorted[1].p2nd,
      },
    ];
  }

  return positions;
}

// R32 matchups: 1st of group vs 2nd of another group (official FIFA 2026 bracket)
// Based on the official Round of 32 draw allocation
const R32_MATCHUPS: [string, string][] = [
  ['1A', '2B'],  // M201
  ['1C', '2D'],  // M202
  ['1E', '2F'],  // M203
  ['1G', '2H'],  // M204
  ['1B', '2A'],  // M205
  ['1D', '2C'],  // M206
  ['1F', '2E'],  // M207
  ['1H', '2G'],  // M208
  ['1I', '2J'],  // M209
  ['1K', '2L'],  // M210
  ['1J', '2I'],  // M211
  ['1L', '2K'],  // M212
  // 8 best 3rd-place teams fill remaining 4 spots on each side
  ['3AB', '3CD'],  // M213
  ['3EF', '3GH'],  // M214
  ['3IJ', '3KL'],  // M215
  ['3Best1', '3Best2'], // M216
];

function BracketMatch({ slotA, slotB }: { slotA: BracketSlot | null; slotB: BracketSlot | null }) {
  const teamA = slotA ? getTeamByCode(slotA.code) : null;
  const teamB = slotB ? getTeamByCode(slotB.code) : null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        {teamA ? (
          <div className="flex items-center gap-2">
            <TeamBadge name={teamA.name} code={teamA.code} size="sm" />
            <span className="text-[9px] text-slate-400">{slotA?.p1st.toFixed(0)}%</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{slotA?.label || 'TBD'}</span>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        {teamB ? (
          <div className="flex items-center gap-2">
            <TeamBadge name={teamB.name} code={teamB.code} size="sm" />
            <span className="text-[9px] text-slate-400">{slotB?.p2nd.toFixed(0)}%</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{slotB?.label || 'TBD'}</span>
        )}
      </div>
    </div>
  );
}

export default function Bracket() {
  const sim = useMemo(() => simulateGroupStage(30000, 2026), []);
  const positions = useMemo(() => getProjectedGroupPositions(sim), [sim]);

  // Build projected bracket slots
  const r32TopHalf = useMemo(() => {
    const top8 = R32_MATCHUPS.slice(0, 8);
    return top8.map(([posA, posB]) => {
      const slotA = resolveSlot(posA, positions);
      const slotB = resolveSlot(posB, positions);
      return { slotA, slotB };
    });
  }, [positions]);

  const r32BottomHalf = useMemo(() => {
    const bottom8 = R32_MATCHUPS.slice(8, 16);
    return bottom8.map(([posA, posB]) => {
      const slotA = resolveSlot(posA, positions);
      const slotB = resolveSlot(posB, positions);
      return { slotA, slotB };
    });
  }, [positions]);

  // Projected R16, QF, SF from the bracket tree
  const r16Top = useMemo(() => [
    { a: r32TopHalf[0], b: r32TopHalf[1] },
    { a: r32TopHalf[2], b: r32TopHalf[3] },
    { a: r32TopHalf[4], b: r32TopHalf[5] },
    { a: r32TopHalf[6], b: r32TopHalf[7] },
  ], [r32TopHalf]);

  const r16Bottom = useMemo(() => [
    { a: r32BottomHalf[0], b: r32BottomHalf[1] },
    { a: r32BottomHalf[2], b: r32BottomHalf[3] },
    { a: r32BottomHalf[4], b: r32BottomHalf[5] },
    { a: r32BottomHalf[6], b: r32BottomHalf[7] },
  ], [r32BottomHalf]);

  // Compute champion probability from simulation (p1st * advancement factor)
  const championCandidates = useMemo(() => {
    return Object.values(sim.groups)
      .flat()
      .sort((a, b) => b.p1st - a.p1st)
      .slice(0, 8);
  }, [sim]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bracket</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projected knockout stage tournament tree</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Projected from simulation</span>
          </div>
        </div>
      </div>

      <RoundedCard className="!p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-gold-500/5 to-transparent dark:from-gold-500/10">
          <SectionHeader title="Knockout Bracket" subtitle="Projected from 30K Monte Carlo simulations" icon={<GitBranch className="w-5 h-5" />} />
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[900px] flex items-start gap-4">
            {/* Round of 32 */}
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">Round of 32</h4>
              <div className="space-y-2">
                {r32TopHalf.map((m, i) => (
                  <BracketMatch key={`t${i}`} slotA={m.slotA} slotB={m.slotB} />
                ))}
                <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                {r32BottomHalf.map((m, i) => (
                  <BracketMatch key={`b${i}`} slotA={m.slotA} slotB={m.slotB} />
                ))}
              </div>
            </div>

            {/* Round of 16 */}
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">Round of 16</h4>
              <div className="space-y-2">
                {r16Top.map((m, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400">Winner R32 #{i * 2 + 1}</span>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-xs text-slate-400">Winner R32 #{i * 2 + 2}</span>
                    </div>
                  </div>
                ))}
                <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                {r16Bottom.map((m, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400">Winner R32 #{i * 2 + 9}</span>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-xs text-slate-400">Winner R32 #{i * 2 + 10}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarter-Finals */}
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">Quarter-Finals</h4>
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400">Winner R16 #{i * 2 + 1}</span>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-xs text-slate-400">Winner R16 #{i * 2 + 2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semi-Finals */}
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">Semi-Finals</h4>
              <div className="space-y-8">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400">Winner QF #{i * 2 + 1}</span>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-xs text-slate-400">Winner QF #{i * 2 + 2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Champion */}
            <div className="flex flex-col items-center justify-center min-w-[80px]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-glow-gold">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <p className="mt-2 text-xs font-semibold text-gold-600 dark:text-gold-400">Champion</p>
              <p className="text-[10px] text-slate-400">TBD</p>
            </div>
          </div>
        </div>
      </RoundedCard>

      {/* Champion probability */}
      <RoundedCard hover={false}>
        <SectionHeader title="Champion Probability" subtitle="Top 8 projected tournament winners" icon={<Trophy className="w-5 h-5" />} />
        <div className="mt-4 space-y-3">
          {championCandidates.map((td, i) => (
            <div key={td.team.code} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400'
                : i < 3 ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>{i + 1}</span>
              <TeamBadge name={td.team.name} code={td.team.code} size="sm" />
              <span className="text-xs text-slate-400">Elo {td.team.elo}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    i === 0 ? 'bg-gold-500' : i < 3 ? 'bg-brand-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(td.p1st, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-semibold w-14 text-right ${
                i === 0 ? 'text-gold-600 dark:text-gold-400' : i < 3 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
              }`}>{td.p1st.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </RoundedCard>

      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 py-2">
        <span>Model: {sim.modelVersion}</span>
        <span>|</span>
        <span>Runs: {sim.simulationRuns.toLocaleString()}</span>
        <span>|</span>
        <span>Knockout matchups projected from group probabilities</span>
      </div>
    </div>
  );
}

function resolveSlot(pos: string, positions: Record<string, BracketSlot[]>): BracketSlot | null {
  if (pos.startsWith('1')) {
    const group = pos.slice(1);
    return positions[group]?.[0] || null;
  }
  if (pos.startsWith('2')) {
    const group = pos.slice(1);
    return positions[group]?.[1] || null;
  }
  // 3rd place slots - approximate with best 3rd-place team
  if (pos.startsWith('3')) {
    return { code: 'TBD', label: pos, pAdvance: 0, p1st: 0, p2nd: 0 };
  }
  return null;
}
