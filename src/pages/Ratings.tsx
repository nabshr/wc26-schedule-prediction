import { Star, ArrowUpDown, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { WC2026_TEAMS, CONFEDERATION_META } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';

type SortKey = 'elo' | 'name' | 'confederation' | 'p1st' | 'pAdvance';
type SortDir = 'asc' | 'desc';

export default function Ratings() {
  const [sortKey, setSortKey] = useState<SortKey>('elo');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confFilter, setConfFilter] = useState('all');
  const [search, setSearch] = useState('');

  const sim = useMemo(() => simulateGroupStage(30000, 2026), []);
  const simMap = useMemo(() => {
    const map: Record<string, { p1st: number; pAdvance: number }> = {};
    for (const group of Object.values(sim.groups)) {
      for (const gp of group) {
        map[gp.team.code] = { p1st: gp.p1st, pAdvance: gp.pAdvance };
      }
    }
    return map;
  }, [sim]);

  const confederations = [...new Set(WC2026_TEAMS.map(t => t.confederation))];

  const sorted = useMemo(() => {
    let teams = [...WC2026_TEAMS];
    if (confFilter !== 'all') teams = teams.filter(t => t.confederation === confFilter);
    if (search) {
      const q = search.toLowerCase();
      teams = teams.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    }
    teams.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'elo') return (a.elo - b.elo) * dir;
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'confederation') return a.confederation.localeCompare(b.confederation) * dir;
      if (sortKey === 'p1st') return ((simMap[a.code]?.p1st || 0) - (simMap[b.code]?.p1st || 0)) * dir;
      return ((simMap[a.code]?.pAdvance || 0) - (simMap[b.code]?.pAdvance || 0)) * dir;
    });
    return teams;
  }, [sortKey, sortDir, confFilter, search, simMap]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const eloMin = Math.min(...WC2026_TEAMS.map(t => t.elo));
  const eloMax = Math.max(...WC2026_TEAMS.map(t => t.elo));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ratings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Team power ratings and comparative strength analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 w-44"
            />
          </div>
          <select
            value={confFilter}
            onChange={e => setConfFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All Confed.</option>
            {confederations.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <RoundedCard className="!p-0 overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <SectionHeader title="Power Ratings" icon={<Star className="w-5 h-5" />} />
          <span className="text-xs text-slate-400">{sorted.length} teams</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer" onClick={() => toggleSort('elo')}>Rank <ArrowUpDown className="w-3 h-3 inline" /></th>
                <th className="cursor-pointer" onClick={() => toggleSort('name')}>Team <ArrowUpDown className="w-3 h-3 inline" /></th>
                <th className="cursor-pointer" onClick={() => toggleSort('elo')}>Elo <ArrowUpDown className="w-3 h-3 inline" /></th>
                <th className="cursor-pointer" onClick={() => toggleSort('p1st')}>Title % <ArrowUpDown className="w-3 h-3 inline" /></th>
                <th className="cursor-pointer" onClick={() => toggleSort('pAdvance')}>Advance % <ArrowUpDown className="w-3 h-3 inline" /></th>
                <th className="cursor-pointer" onClick={() => toggleSort('confederation')}>Confed <ArrowUpDown className="w-3 h-3 inline" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((team, i) => {
                const rank = sortDir === 'desc' && sortKey === 'elo' ? i + 1 : WC2026_TEAMS.sort((a, b) => b.elo - a.elo).findIndex(t => t.code === team.code) + 1;
                const conf = CONFEDERATION_META[team.confederation];
                const simData = simMap[team.code];
                return (
                  <tr key={team.code}>
                    <td>
                      <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${
                        rank <= 3 ? 'bg-gold-500/10 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400' : rank <= 8 ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>{rank}</span>
                    </td>
                    <td><TeamBadge name={team.name} code={team.code} size="sm" /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{team.elo}</span>
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${team.elo >= 1900 ? 'bg-gold-500' : team.elo >= 1700 ? 'bg-brand-500' : 'bg-slate-400'}`}
                            style={{ width: `${((team.elo - eloMin) / (eloMax - eloMin)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {simData ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${simData.p1st > 10 ? 'bg-gold-500' : simData.p1st > 3 ? 'bg-brand-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.min(simData.p1st * 3, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{simData.p1st.toFixed(1)}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">--</span>}
                    </td>
                    <td>
                      {simData ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${simData.pAdvance > 75 ? 'bg-success' : simData.pAdvance > 50 ? 'bg-brand-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.min(simData.pAdvance, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${simData.pAdvance > 75 ? 'text-success' : simData.pAdvance > 50 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>{simData.pAdvance.toFixed(0)}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">--</span>}
                    </td>
                    <td>
                      <span className={`badge ${conf?.bgClass || ''} ${conf?.textClass || ''} text-[10px]`}>
                        {team.confederation}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RoundedCard>

      <RoundedCard hover={false}>
        <SectionHeader title="Rating Distribution" subtitle="Elo ratings across the 48-team field" />
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-xl bg-gold-50 dark:bg-gold-500/10">
            <p className="text-2xl font-bold text-gold-600 dark:text-gold-400">{WC2026_TEAMS.filter(t => t.elo >= 1900).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Elite (1900+)</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{WC2026_TEAMS.filter(t => t.elo >= 1700 && t.elo < 1900).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Strong (1700-1899)</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{WC2026_TEAMS.filter(t => t.elo < 1700).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Developing (&lt;1700)</p>
          </div>
        </div>
      </RoundedCard>
    </div>
  );
}
