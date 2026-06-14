import { CalendarDays, Search, Clock, MapPin } from 'lucide-react';
import { useState, useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import SegmentedTabs from '../components/SegmentedTabs';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { GROUP_NAMES, getTeamByCode } from '../data/worldCup2026';
import { WC2026_FIXTURES, WC2026Fixture, STAGE_LABELS } from '../data/fixtures2026';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

// Convert UTC time to Nepal time (Asia/Kathmandu, UTC+5:45)
function toNepalTime(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const utcDate = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
  const nepalTime = new Date(utcDate.getTime() + 345 * 60000);
  return nepalTime.toISOString().slice(11, 16);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function MatchCard({ f }: { f: WC2026Fixture }) {
  const homeTeam = getTeamByCode(f.home);
  const awayTeam = getTeamByCode(f.away);
  const nptTime = toNepalTime(f.date, f.timeUTC);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 hover:border-brand-500/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {f.stage === 'group' && <span className="badge-brand">Group {f.group}</span>}
          <span className="text-[10px] text-slate-400">{STAGE_LABELS[f.stage]}{f.matchday ? ` MD${f.matchday}` : ''}</span>
        </div>
        <span className={`badge ${f.status === 'completed' ? 'badge-success' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
          {f.status === 'completed' ? 'FT' : `${nptTime} NPT`}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {homeTeam ? <TeamBadge name={homeTeam.name} code={homeTeam.code} size="sm" /> : <span className="text-sm text-slate-400">TBD</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {f.status === 'completed' && f.homeScore !== null && f.awayScore !== null ? (
            <>
              <span className={`text-lg font-bold ${f.homeScore > f.awayScore ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>{f.homeScore}</span>
              <span className="text-xs text-slate-400">-</span>
              <span className={`text-lg font-bold ${f.awayScore > f.homeScore ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>{f.awayScore}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">vs</span>
          )}
        </div>
        <div className="flex-1 flex justify-end min-w-0">
          {awayTeam ? <TeamBadge name={awayTeam.name} code={awayTeam.code} size="sm" /> : <span className="text-sm text-slate-400">TBD</span>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.city}</span>
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(f.date)}</span>
      </div>
    </div>
  );
}

export default function Schedule() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const filteredFixtures = useMemo(() => {
    let fixtures = WC2026_FIXTURES;

    if (activeTab === 'upcoming') fixtures = fixtures.filter(f => f.status === 'scheduled');
    else if (activeTab === 'completed') fixtures = fixtures.filter(f => f.status === 'completed');

    if (groupFilter !== 'all') fixtures = fixtures.filter(f => f.group === groupFilter);
    if (stageFilter !== 'all') fixtures = fixtures.filter(f => f.stage === stageFilter);

    if (search) {
      const q = search.toLowerCase();
      fixtures = fixtures.filter(f => {
        const home = getTeamByCode(f.home);
        const away = getTeamByCode(f.away);
        return (
          (home && home.name.toLowerCase().includes(q)) ||
          (away && away.name.toLowerCase().includes(q)) ||
          f.venue.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          STAGE_LABELS[f.stage]?.toLowerCase().includes(q)
        );
      });
    }

    return fixtures;
  }, [activeTab, search, groupFilter, stageFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, WC2026Fixture[]> = {};
    for (const f of filteredFixtures) {
      const key = f.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredFixtures]);

  const completedCount = WC2026_FIXTURES.filter(f => f.status === 'completed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedule & Results</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">World Cup 2026 match schedule and results</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams, venues, cities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All Groups</option>
            {GROUP_NAMES.map(g => <option key={g} value={g}>Group {g}</option>)}
          </select>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark-100 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredFixtures.length}</span> matches
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{completedCount}</span> completed
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg px-2.5 py-1 flex items-center gap-1">
          <Clock className="w-3 h-3" /> All times NPT (UTC+5:45)
        </span>
      </div>

      {groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map(([date, fixtures]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(date)}</h2>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400">{fixtures.length} matches</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fixtures.map(f => <MatchCard key={f.id} f={f} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <RoundedCard hover={false}>
          <div className="py-16 flex flex-col items-center text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            {activeTab === 'completed' ? (
              <>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No completed matches found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters.</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No matches found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        </RoundedCard>
      )}
    </div>
  );
}
