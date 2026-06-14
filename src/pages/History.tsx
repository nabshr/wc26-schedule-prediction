import { useState, useEffect, useCallback } from 'react';
import { Clock, Trophy, ChevronLeft, ChevronRight, Filter, Users, Swords, Calendar } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import SegmentedTabs from '../components/SegmentedTabs';
import EmptyState from '../components/EmptyState';
import {
  fetchTournaments,
  fetchTournamentByYear,
  fetchStages,
  fetchMatches,
  fetchGroupStandings,
  type Tournament,
  type Stage,
  type Match,
  type GroupStanding,
} from '../lib/supabase';

const HOSTS: Record<number, string> = {
  1930: 'Uruguay', 1934: 'Italy', 1938: 'France', 1950: 'Brazil',
  1954: 'Switzerland', 1958: 'Sweden', 1962: 'Chile', 1966: 'England',
  1970: 'Mexico', 1974: 'West Germany', 1978: 'Argentina', 1982: 'Spain',
  1986: 'Mexico', 1990: 'Italy', 1994: 'USA', 1998: 'France',
  2002: 'South Korea/Japan', 2006: 'Germany', 2010: 'South Africa',
  2014: 'Brazil', 2018: 'Russia', 2022: 'Qatar',
};

const WINNERS: Record<number, string> = {
  1930: 'Uruguay', 1934: 'Italy', 1938: 'Italy', 1950: 'Uruguay',
  1954: 'West Germany', 1958: 'Brazil', 1962: 'Brazil', 1966: 'England',
  1970: 'Brazil', 1974: 'West Germany', 1978: 'Argentina', 1982: 'Italy',
  1986: 'Argentina', 1990: 'West Germany', 1994: 'Brazil', 1998: 'France',
  2002: 'Brazil', 2006: 'Italy', 2010: 'Spain', 2014: 'Germany',
  2018: 'France', 2022: 'Argentina',
};

export default function History() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments()
      .then(data => {
        setTournaments(data);
        if (data.length > 0) setSelectedYear(data[0].year);
      })
      .catch(err => setError(err.message));
  }, []);

  const loadData = useCallback(async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const tournament = await fetchTournamentByYear(year);
      if (!tournament) { setStages([]); setMatches([]); setStandings([]); return; }
      const [s, m, g] = await Promise.all([
        fetchStages(tournament.id),
        fetchMatches(tournament.id),
        fetchGroupStandings(tournament.id),
      ]);
      setStages(s);
      setMatches(m);
      setStandings(g);
      setSelectedStage(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedYear) loadData(selectedYear);
  }, [selectedYear, loadData]);

  const filteredMatches = selectedStage
    ? matches.filter(m => m.stage?.name === selectedStage)
    : matches;

  const groupNames = [...new Set(standings.map(s => s.group_name))].sort();
  const stageTabs = [
    { id: '__all__', label: 'All Stages' },
    ...stages.map(s => ({ id: s.name, label: s.name })),
  ];

  const currentIdx = tournaments.findIndex(t => t.year === selectedYear);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tournaments.length} World Cup tournaments from {tournaments.length > 0 ? tournaments[tournaments.length - 1].year : 1930} to {tournaments.length > 0 ? tournaments[0].year : 2022}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Year Selector */}
      <RoundedCard hover={false}>
        <SectionHeader title="Select Tournament" subtitle="Browse historical World Cups" icon={<Calendar className="w-5 h-5" />} />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => currentIdx < tournaments.length - 1 && setSelectedYear(tournaments[currentIdx + 1].year)}
            disabled={currentIdx >= tournaments.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 overflow-x-auto scrollbar-thin">
            <div className="flex gap-1.5 py-1">
              {tournaments.map(t => (
                <button
                  key={t.year}
                  onClick={() => setSelectedYear(t.year)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    t.year === selectedYear
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.year}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => currentIdx > 0 && setSelectedYear(tournaments[currentIdx - 1].year)}
            disabled={currentIdx <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </RoundedCard>

      {selectedYear && (
        <>
          {/* Tournament Info Banner */}
          <div className="card p-5 bg-gradient-to-r from-brand-600 to-brand-800 dark:from-brand-800 dark:to-brand-950 border-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-gold-400" />
                  <h2 className="text-xl font-bold text-white">{selectedYear} FIFA World Cup</h2>
                </div>
                <p className="text-sm text-brand-200">
                  Hosted by {HOSTS[selectedYear] || 'Unknown'}
                  {WINNERS[selectedYear] && ` · Winner: ${WINNERS[selectedYear]}`}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{matches.length}</div>
                  <div className="text-xs text-brand-200">Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stages.length}</div>
                  <div className="text-xs text-brand-200">Stages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{groupNames.length}</div>
                  <div className="text-xs text-brand-200">Groups</div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Group Standings */}
              {groupNames.length > 0 && (
                <RoundedCard hover={false}>
                  <SectionHeader
                    title="Group Stage Standings"
                    subtitle={`${groupNames.length} groups`}
                    icon={<Users className="w-5 h-5" />}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {groupNames.map(gName => (
                      <div key={gName} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{gName}</h4>
                        </div>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th className="!py-2 !px-3">#</th>
                              <th className="!py-2 !px-3">Team</th>
                              <th className="!py-2 !px-3 text-center">P</th>
                              <th className="!py-2 !px-3 text-center">W</th>
                              <th className="!py-2 !px-3 text-center">D</th>
                              <th className="!py-2 !px-3 text-center">L</th>
                              <th className="!py-2 !px-3 text-center">GF</th>
                              <th className="!py-2 !px-3 text-center">GA</th>
                              <th className="!py-2 !px-3 text-center">GD</th>
                              <th className="!py-2 !px-3 text-center font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings
                              .filter(s => s.group_name === gName)
                              .sort((a, b) => a.position - b.position)
                              .map(s => (
                                <tr key={s.id}>
                                  <td className="!py-2 !px-3 text-xs text-slate-500">{s.position}</td>
                                  <td className="!py-2 !px-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {s.team?.name || '—'}
                                  </td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.played}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.won}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.drawn}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.lost}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.goals_for}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.goals_against}</td>
                                  <td className="!py-2 !px-3 text-center text-sm">{s.goal_difference > 0 ? '+' : ''}{s.goal_difference}</td>
                                  <td className="!py-2 !px-3 text-center text-sm font-bold text-brand-600 dark:text-brand-400">{s.points}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </RoundedCard>
              )}

              {/* Matches by Stage */}
              <RoundedCard hover={false}>
                <SectionHeader
                  title="Matches"
                  subtitle={`${filteredMatches.length} matches${selectedStage ? ` in ${selectedStage}` : ' across all stages'}`}
                  icon={<Swords className="w-5 h-5" />}
                  action={
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <SegmentedTabs
                        tabs={stageTabs}
                        active={selectedStage || '__all__'}
                        onChange={id => setSelectedStage(id === '__all__' ? null : id)}
                      />
                    </div>
                  }
                />

                {filteredMatches.length === 0 ? (
                  <EmptyState
                    icon={<Swords className="w-8 h-8 text-slate-400" />}
                    title="No matches"
                    description="No match data available for this selection."
                  />
                ) : (
                  <div className="space-y-1 mt-2">
                    {filteredMatches.map(m => {
                      const homeTeam = m.home_team?.name || '—';
                      const awayTeam = m.away_team?.name || '—';
                      const isHomeWin = m.home_score > m.away_score;
                      const isAwayWin = m.away_score > m.home_score;
                      const isDraw = m.home_score === m.away_score;

                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Stage badge */}
                          <div className="hidden sm:block w-24 flex-shrink-0">
                            <span className={`badge text-[10px] ${
                              m.stage?.name === 'Final' ? 'badge-gold' :
                              m.stage?.name === 'Semi-Finals' ? 'badge-brand' :
                              m.stage?.name === 'Quarter-Finals' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                              m.group_name ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {m.group_name || m.stage?.name}
                            </span>
                          </div>

                          {/* Match */}
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <div className={`flex-1 text-sm font-medium truncate ${
                              isHomeWin ? 'text-slate-900 dark:text-white' : isDraw ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {homeTeam}
                            </div>

                            <div className="flex-shrink-0 flex items-center gap-1.5 mx-3">
                              <span className={`text-sm font-bold tabular-nums ${
                                isHomeWin ? 'text-brand-600 dark:text-brand-400' : ''
                              }`}>
                                {m.home_score}
                              </span>
                              <span className="text-xs text-slate-400">-</span>
                              <span className={`text-sm font-bold tabular-nums ${
                                isAwayWin ? 'text-brand-600 dark:text-brand-400' : ''
                              }`}>
                                {m.away_score}
                              </span>
                              {m.is_penalties && (
                                <span className="text-[10px] text-slate-400 ml-1">
                                  ({m.home_pen_score}-{m.away_pen_score} pen)
                                </span>
                              )}
                              {m.is_extra_time && !m.is_penalties && (
                                <span className="text-[10px] text-slate-400 ml-1">aet</span>
                              )}
                            </div>

                            <div className={`flex-1 text-sm font-medium truncate text-right ${
                              isAwayWin ? 'text-slate-900 dark:text-white' : isDraw ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {awayTeam}
                            </div>
                          </div>

                          {/* Mobile stage indicator */}
                          <div className="sm:hidden flex-shrink-0">
                            <span className="badge text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              {m.group_name || m.stage?.name?.replace('Stage', '').trim()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </RoundedCard>
            </>
          )}
        </>
      )}

      {!selectedYear && tournaments.length === 0 && !error && (
        <RoundedCard>
          <EmptyState
            icon={<Clock className="w-8 h-8 text-slate-400" />}
            title="No tournament data"
            description="Historical World Cup data will appear here once imported."
          />
        </RoundedCard>
      )}
    </div>
  );
}
