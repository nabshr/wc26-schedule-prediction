import { TrendingUp, Radio, Target, ChevronDown } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import TeamBadge from '../components/TeamBadge';
import ProbabilityBar from '../components/ProbabilityBar';
import { WC2026_TEAMS, CONFEDERATION_META, getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage, type GroupProbabilities } from '../lib/prediction';

function TeamFocusSelector({
  teams,
  selected,
  onSelect,
}: {
  teams: typeof WC2026_TEAMS;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const selectedTeam = getTeamByCode(selected);
  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm hover:border-brand-500/40 transition-colors"
      >
        {selectedTeam ? (
          <TeamBadge name={selectedTeam.name} code={selectedTeam.code} size="sm" />
        ) : (
          <span className="text-slate-500">Select team...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {filtered.map(t => (
            <button
              key={t.code}
              onClick={() => { onSelect(t.code); setOpen(false); setQuery(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                t.code === selected ? 'bg-brand-50 dark:bg-brand-500/10' : ''
              }`}
            >
              <TeamBadge name={t.name} code={t.code} size="sm" />
              <span className="text-[10px] text-slate-400 ml-auto">Elo {t.elo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiveForecast() {
  const sim = useMemo(() => simulateGroupStage(30000, 2026), []);
  const [focusTeam, setFocusTeam] = useState('FRA');

  const allProbs = useMemo(
    () => Object.values(sim.groups).flat(),
    [sim]
  );

  const focusData = useMemo(
    () => allProbs.find(td => td.team.code === focusTeam),
    [allProbs, focusTeam]
  );

  const top5 = useMemo(
    () => [...allProbs].sort((a, b) => b.p1st - a.p1st).slice(0, 5),
    [allProbs]
  );

  const biggestDangers = useMemo(
    () => WC2026_TEAMS.filter(t => t.elo >= 1900).sort((a, b) => b.elo - a.elo).slice(0, 5),
    []
  );

  // Estimate knockout round progression probabilities
  // These are rough estimates based on p1st and Elo
  function getKnockoutProbs(td: GroupProbabilities) {
    const pR32 = td.pAdvance;
    const pR16 = pR32 * Math.min(0.85, 0.5 + (td.team.elo - 1500) / 2000);
    const pQF = pR16 * Math.min(0.8, 0.4 + (td.team.elo - 1500) / 2500);
    const pSF = pQF * Math.min(0.75, 0.35 + (td.team.elo - 1600) / 3000);
    const pFinal = pSF * Math.min(0.7, 0.3 + (td.team.elo - 1700) / 3000);
    const pChampion = pFinal * Math.min(0.65, 0.25 + (td.team.elo - 1800) / 4000);
    return { pR32, pR16, pQF, pSF, pFinal, pChampion };
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Forecast</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tournament predictions and round-by-round progression</p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400" />
          <TeamFocusSelector teams={WC2026_TEAMS} selected={focusTeam} onSelect={setFocusTeam} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassPanel className="lg:col-span-2">
          <SectionHeader title="Tournament Win Probability" subtitle="Top 5 teams by probability of winning" icon={<TrendingUp className="w-5 h-5" />} />
          <div className="mt-4 space-y-4">
            {top5.map((td, i) => (
              <div key={td.team.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>{i + 1}</span>
                    <TeamBadge name={td.team.name} code={td.team.code} size="md" />
                    <span className="text-xs text-slate-400">Elo {td.team.elo}</span>
                  </div>
                  <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{td.p1st.toFixed(1)}%</span>
                </div>
                <ProbabilityBar label="" value={td.p1st} size="md" color={i === 0 ? 'bg-gold-500' : 'bg-brand-500'} showPercent={false} />
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel>
          <SectionHeader title="Danger Teams" subtitle="Highest-rated contenders" icon={<Radio className="w-5 h-5" />} />
          <div className="mt-4 space-y-3">
            {biggestDangers.map(t => {
              const advProb = allProbs.find(td => td.team.code === t.code)?.pAdvance || 0;
              return (
                <div key={t.code} className="flex items-center gap-3">
                  <TeamBadge name={t.name} code={t.code} size="sm" />
                  <div className="flex-1">
                    <ProbabilityBar label="" value={advProb} size="sm" color="bg-brand-500" showPercent={false} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-14 text-right">{advProb.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Model Version</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sim.modelVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Simulation Runs</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sim.simulationRuns.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tournament Stage</span>
              <span className="badge-brand">Group Stage</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Focus Team Deep Dive */}
      {focusData && (
        <RoundedCard hover={false}>
          <SectionHeader
            title={`${focusData.team.name} — Progression Forecast`}
            subtitle={`Round-by-round knockout progression probability`}
            icon={<Target className="w-5 h-5" />}
          />
          <div className="mt-4 space-y-4">
            {(() => {
              const probs = getKnockoutProbs(focusData);
              const rounds = [
                { label: 'Group Advance (R32)', value: probs.pR32 },
                { label: 'Round of 16', value: probs.pR16 },
                { label: 'Quarter-Final', value: probs.pQF },
                { label: 'Semi-Final', value: probs.pSF },
                { label: 'Final', value: probs.pFinal },
                { label: 'Champion', value: probs.pChampion },
              ];
              return rounds.map(r => (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.label}</span>
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{r.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        r.value > 60 ? 'bg-success' : r.value > 30 ? 'bg-brand-500' : r.value > 10 ? 'bg-amber-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(r.value, 100)}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">Group Position</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">1st: {focusData.p1st.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">2nd Place</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{focusData.p2nd.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">3rd Place</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{focusData.p3rd.toFixed(0)}%</p>
            </div>
          </div>
        </RoundedCard>
      )}

      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 py-2">
        <span>Model: {sim.modelVersion}</span>
        <span>|</span>
        <span>Runs: {sim.simulationRuns.toLocaleString()}</span>
        <span>|</span>
        <span>Knockout progression: Elo-based estimates</span>
      </div>
    </div>
  );
}
