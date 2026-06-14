import { Trophy, Calendar, Brain, TrendingUp, BarChart3, Target, Shield, Cpu } from 'lucide-react';
import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import TeamBadge from '../components/TeamBadge';
import ProbabilityBar from '../components/ProbabilityBar';
import { WC2026_TEAMS, GROUP_NAMES } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';

export default function Dashboard() {
  const sim = useMemo(() => simulateGroupStage(30000, 2026), []);

  const topFavorites = Object.values(sim.groups)
    .flat()
    .sort((a, b) => b.p1st - a.p1st)
    .slice(0, 8);

  const avgAdvance = Object.values(sim.groups)
    .flat()
    .reduce((sum, td) => sum + td.pAdvance, 0) / 48;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">FIFA World Cup 2026 Prediction Overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Matches" value="104" icon={<Calendar className="w-5 h-5" />} accent="brand" />
        <StatCard label="Simulation Runs" value={sim.simulationRuns.toLocaleString()} icon={<Cpu className="w-5 h-5" />} accent="gold" />
        <StatCard label="Avg Advance %" value={`${avgAdvance.toFixed(1)}%`} icon={<Target className="w-5 h-5" />} accent="success" />
        <StatCard label="Qualified Teams" value="48" icon={<Shield className="w-5 h-5" />} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RoundedCard hover={false}>
            <SectionHeader title="Top Favorites" subtitle="Tournament win probability from Monte Carlo simulation" icon={<Trophy className="w-5 h-5" />} />
            <div className="space-y-4 mt-4">
              {topFavorites.map((td, i) => (
                <div key={td.team.code}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>{i + 1}</span>
                      <TeamBadge name={td.team.name} code={td.team.code} size="sm" />
                      <span className="text-[10px] text-slate-400">G{td.team.group}</span>
                    </div>
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{td.p1st.toFixed(1)}%</span>
                  </div>
                  <ProbabilityBar
                    label=""
                    value={td.p1st}
                    size="sm"
                    color={i === 0 ? 'bg-gold-500' : i < 3 ? 'bg-brand-500' : 'bg-slate-400'}
                    showPercent={false}
                  />
                </div>
              ))}
            </div>
          </RoundedCard>
        </div>

        <GlassPanel>
          <SectionHeader title="Quick Stats" icon={<TrendingUp className="w-5 h-5" />} />
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tournament Stage</span>
              <span className="badge-brand">Group Stage</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Simulation Runs</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sim.simulationRuns.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Model Version</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sim.modelVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Groups</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{GROUP_NAMES.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Group Matches</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">72</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Format</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">R32</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      <RoundedCard hover={false}>
        <SectionHeader title="Advancement Probability Distribution" subtitle="All 48 teams ranked by knockout stage probability" icon={<BarChart3 className="w-5 h-5" />} />
        <div className="mt-4">
          <div className="flex items-end gap-[2px] h-40">
            {Object.values(sim.groups)
              .flat()
              .sort((a, b) => b.pAdvance - a.pAdvance)
              .map(td => {
                const height = Math.max(4, (td.pAdvance / 100) * 100);
                return (
                  <div
                    key={td.team.code}
                    className="flex-1 min-w-[6px] rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${height}%`,
                      backgroundColor: td.pAdvance > 75 ? '#10B981' : td.pAdvance > 50 ? '#3B82F6' : td.pAdvance > 25 ? '#F59E0B' : '#94A3B8',
                    }}
                    title={`${td.team.name}: ${td.pAdvance.toFixed(1)}%`}
                  />
                );
              })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> &gt;75%</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /> 50-75%</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500" /> 25-50%</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-400" /> &lt;25%</div>
          </div>
        </div>
      </RoundedCard>
    </div>
  );
}
