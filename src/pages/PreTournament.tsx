import { Flag, BarChart3, Target, ChevronDown, Clock } from 'lucide-react';
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

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex min-w-[220px] items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm hover:border-brand-500/40 transition-colors"
      >
        {getTeamByCode(selected) ? (
          <TeamBadge name={getTeamByCode(selected)!.name} code={selected} size="sm" />
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

function getKnockoutProbs(td: GroupProbabilities) {
  const pR32 = td.pAdvance;
  const pR16 = pR32 * Math.min(0.85, 0.5 + (td.team.elo - 1500) / 2000);
  const pQF = pR16 * Math.min(0.8, 0.4 + (td.team.elo - 1500) / 2500);
  const pSF = pQF * Math.min(0.75, 0.35 + (td.team.elo - 1600) / 3000);
  const pFinal = pSF * Math.min(0.7, 0.3 + (td.team.elo - 1700) / 3000);
  const pChampion = pFinal * Math.min(0.65, 0.25 + (td.team.elo - 1800) / 4000);
  return { pR32, pR16, pQF, pSF, pFinal, pChampion };
}

export default function PreTournament() {
  const sim = useMemo(() => simulateGroupStage(30000, 2026), []);
  const [focusTeam, setFocusTeam] = useState('FRA');

  const allProbs = useMemo(() => Object.values(sim.groups).flat(), [sim]);

  const focusData = useMemo(
    () => allProbs.find(td => td.team.code === focusTeam),
    [allProbs, focusTeam]
  );

  const championTable = useMemo(
    () => [...allProbs].sort((a, b) => b.p1st - a.p1st).slice(0, 12),
    [allProbs]
  );

  const advancementTable = useMemo(
    () => [...allProbs].sort((a, b) => b.pAdvance - a.pAdvance).slice(0, 12),
    [allProbs]
  );

  const favorites = useMemo(
    () => WC2026_TEAMS.filter(t => t.elo >= 1850).sort((a, b) => b.elo - a.elo),
    []
  );

  const lockedTimestamp = 'Pre-tournament baseline (Elo-Poisson-DC-v1.0)';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pre-Tournament</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Baseline analysis and predictions before kickoff</p>
        </div>
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-slate-400" />
          <TeamFocusSelector teams={WC2026_TEAMS} selected={focusTeam} onSelect={setFocusTeam} />
        </div>
      </div>

      {/* Model metadata bar */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">{lockedTimestamp}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
          <BarChart3 className="w-3 h-3 text-brand-500" />
          <span className="text-slate-600 dark:text-slate-300">{sim.simulationRuns.toLocaleString()} runs</span>
        </div>
        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-600 dark:text-slate-300">{sim.modelVersion}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Champion odds table */}
        <GlassPanel className="lg:col-span-2">
          <SectionHeader title="Champion Odds" subtitle="Top 12 by tournament win probability" icon={<Flag className="w-5 h-5" />} />
          <div className="space-y-3 mt-4">
            {championTable.map((td, i) => (
              <div key={td.team.code} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400'
                  : i < 3 ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>{i + 1}</span>
                <TeamBadge name={td.team.name} code={td.team.code} size="sm" />
                <span className="text-xs text-slate-400">Elo {td.team.elo}</span>
                <div className="flex-1">
                  <ProbabilityBar label="" value={td.p1st} size="sm" color={i === 0 ? 'bg-gold-500' : i < 3 ? 'bg-brand-500' : 'bg-slate-400'} showPercent={false} />
                </div>
                <span className={`text-sm font-semibold w-16 text-right ${
                  i === 0 ? 'text-gold-600 dark:text-gold-400' : i < 3 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
                }`}>{td.p1st.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Favorites panel */}
        <GlassPanel>
          <SectionHeader title="Tournament Favorites" subtitle="Teams rated 1850+ Elo" icon={<BarChart3 className="w-5 h-5" />} />
          <div className="mt-4 space-y-3">
            {favorites.map((t, i) => {
              const conf = CONFEDERATION_META[t.confederation];
              const advProb = allProbs.find(td => td.team.code === t.code)?.pAdvance || 0;
              return (
                <div key={t.code} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>{i + 1}</span>
                  <TeamBadge name={t.name} code={t.code} size="sm" />
                  <span className={`badge ${conf?.bgClass || ''} ${conf?.textClass || ''} text-[9px]`}>{t.confederation}</span>
                  <span className="text-sm font-semibold text-success ml-auto">{advProb.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* Focus Team Progression */}
      {focusData && (
        <RoundedCard hover={false}>
          <SectionHeader
            title={`${focusData.team.name} — Knockout Progression`}
            subtitle="Round-by-round probability forecast"
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
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">1st</p>
              <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{focusData.p1st.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">2nd</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{focusData.p2nd.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">3rd</p>
              <p className="text-sm font-bold text-slate-500">{focusData.p3rd.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">4th</p>
              <p className="text-sm font-bold text-slate-400">{focusData.p4th.toFixed(0)}%</p>
            </div>
          </div>
        </RoundedCard>
      )}

      {/* Advancement histogram */}
      <RoundedCard hover={false}>
        <SectionHeader title="Advancement Histogram" subtitle="Probability distribution across all 48 teams" icon={<BarChart3 className="w-5 h-5" />} />
        <div className="mt-4 flex items-end gap-1 h-48 px-2">
          {[...allProbs]
            .sort((a, b) => b.pAdvance - a.pAdvance)
            .map((td) => {
              const height = (td.pAdvance / 100) * 100;
              const isFocus = td.team.code === focusTeam;
              return (
                <div
                  key={td.team.code}
                  className={`flex-1 min-w-[8px] rounded-t transition-all duration-500 hover:opacity-80 relative group ${isFocus ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
                  style={{
                    height: `${height}%`,
                    backgroundColor: isFocus ? '#3B82F6' : td.pAdvance > 75 ? '#10B981' : td.pAdvance > 50 ? '#3B82F6' : td.pAdvance > 25 ? '#F59E0B' : '#94A3B8',
                  }}
                  title={`${td.team.name}: ${td.pAdvance.toFixed(1)}%`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {td.team.code}
                  </div>
                </div>
              );
            })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> &gt;75%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /> 50-75%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500" /> 25-50%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-400" /> &lt;25%</div>
        </div>
      </RoundedCard>

      {/* Top 12 advancement table */}
      <RoundedCard hover={false}>
        <SectionHeader title="Advancement Odds" subtitle="Top 12 teams by Round of 32 probability" icon={<Flag className="w-5 h-5" />} />
        <div className="mt-4 space-y-2">
          {advancementTable.map((td, i) => {
            const probs = getKnockoutProbs(td);
            return (
              <div key={td.team.code} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  i < 4 ? 'bg-success/10 text-success dark:bg-success/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>{i + 1}</span>
                <TeamBadge name={td.team.name} code={td.team.code} size="sm" />
                <span className="text-[10px] text-slate-400 w-8">G{td.team.group}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${td.pAdvance > 75 ? 'bg-success' : td.pAdvance > 50 ? 'bg-brand-500' : 'bg-slate-400'}`}
                    style={{ width: `${Math.min(td.pAdvance, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold w-14 text-right ${
                  td.pAdvance > 75 ? 'text-success' : td.pAdvance > 50 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
                }`}>{td.pAdvance.toFixed(1)}%</span>
                <span className="text-[9px] text-slate-400 w-16 text-right">Champ {probs.pChampion.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </RoundedCard>
    </div>
  );
}
