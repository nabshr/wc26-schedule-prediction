import { Shield, Search } from 'lucide-react';
import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { WC2026_TEAMS, GROUP_NAMES, getTeamsByGroup, CONFEDERATION_META } from '../data/worldCup2026';

export default function Teams() {
  const [search, setSearch] = useState('');
  const [confFilter, setConfFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'groups'>('groups');

  const confederations = [...new Set(WC2026_TEAMS.map(t => t.confederation))];

  const filteredTeams = WC2026_TEAMS.filter(t => {
    if (confFilter !== 'all' && t.confederation !== confFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teams</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All 48 qualified teams and their tournament profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >Grid</button>
          <button
            onClick={() => setViewMode('groups')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'groups' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >By Group</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
          />
        </div>
        <select
          value={confFilter}
          onChange={e => setConfFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="all">All Confed.</option>
          {confederations.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredTeams.map(t => {
            const conf = CONFEDERATION_META[t.confederation];
            return (
              <RoundedCard key={t.code} className="!p-3 text-center">
                <TeamBadge name={t.name} code={t.code} size="md" showName={false} />
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{t.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`badge ${conf?.bgClass || ''} ${conf?.textClass || ''} text-[9px]`}>{t.confederation}</span>
                  <span className="text-[9px] text-slate-400">G{t.group}</span>
                </div>
              </RoundedCard>
            );
          })}
        </div>
      )}

      {/* Groups View */}
      {viewMode === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {GROUP_NAMES.map(g => {
            const teams = getTeamsByGroup(g).filter(t => {
              if (confFilter !== 'all' && t.confederation !== confFilter) return false;
              if (!search) return true;
              const q = search.toLowerCase();
              return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
            });
            if (teams.length === 0) return null;
            return (
              <RoundedCard key={g} className="!p-0 overflow-hidden" hover={false}>
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-brand-600/5 to-transparent dark:from-brand-500/10">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Group {g}</h3>
                </div>
                <div className="p-4 space-y-2.5">
                  {teams.map((t, i) => {
                    const conf = CONFEDERATION_META[t.confederation];
                    return (
                      <div key={t.code} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          i < 2 ? 'bg-success/10 text-success dark:bg-success/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>{i + 1}</span>
                        <TeamBadge name={t.name} code={t.code} size="sm" />
                        <div className="ml-auto flex items-center gap-2">
                          <span className={`badge ${conf?.bgClass || ''} ${conf?.textClass || ''} text-[9px]`}>{t.confederation}</span>
                          <span className="text-[10px] text-slate-400">Elo {t.elo}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RoundedCard>
            );
          })}
        </div>
      )}

      <RoundedCard hover={false}>
        <SectionHeader title="Confederation Breakdown" icon={<Shield className="w-5 h-5" />} />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {confederations.map(c => {
            const conf = CONFEDERATION_META[c];
            const count = WC2026_TEAMS.filter(t => t.confederation === c).length;
            return (
              <div key={c} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className={`badge ${conf?.bgClass || ''} ${conf?.textClass || ''} text-[10px]`}>{c}</span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-2">{count}</p>
                <p className="text-[10px] text-slate-400">teams</p>
              </div>
            );
          })}
        </div>
      </RoundedCard>
    </div>
  );
}
