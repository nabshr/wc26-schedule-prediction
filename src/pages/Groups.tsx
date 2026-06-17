import { Grid3X3, Cpu, CalendarDays, BarChart3 } from 'lucide-react';
import { useState, useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { GROUP_NAMES, getTeamsByGroup, getTeamByCode } from '../data/worldCup2026';
import { simulateGroupStage, type GroupProbabilities } from '../lib/prediction';
import { useWC2026Fixtures, type MergedFixture } from '../lib/useWC2026Fixtures';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED } from '../lib/simulationConfig';

function toNepalTime(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const utcDate = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
  const nepalTime = new Date(utcDate.getTime() + 345 * 60000);
  return nepalTime.toISOString().slice(11, 16);
}

type GroupTab = 'standings' | 'fixtures' | 'probabilities';

function GroupCard({ group, simData, allFixtures }: { group: string; simData: GroupProbabilities[]; allFixtures: MergedFixture[] }) {
  const [tab, setTab] = useState<GroupTab>('probabilities');
  const fixtures = useMemo(
    () => allFixtures.filter(f => f.stage === 'group' && f.group === group),
    [allFixtures, group]
  );

  const tabConfig: { id: GroupTab; label: string; icon: React.ReactNode }[] = [
    { id: 'standings', label: 'Standings', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'fixtures', label: 'Fixtures', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'probabilities', label: 'Probabilities', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <RoundedCard className="!p-0 overflow-hidden" hover={false}>
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-brand-600/5 to-transparent dark:from-brand-500/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Group {group}</h3>
          <span className="badge-brand text-[10px]">4 teams</span>
        </div>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-700/50">
        {tabConfig.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              tab === t.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/5'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'standings' && <StandingsTab fixtures={fixtures} simData={simData} />}
        {tab === 'fixtures' && <FixturesTab fixtures={fixtures} />}
        {tab === 'probabilities' && <ProbabilitiesTab simData={simData} />}
      </div>
    </RoundedCard>
  );
}

function StandingsTab({ fixtures, simData }: { fixtures: MergedFixture[]; simData: GroupProbabilities[] }) {
  const teams = simData.map(sd => sd.team);
  const hasResults = fixtures.some(f => f.status === 'completed');

  if (!hasResults) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">Pre-tournament</span>
          <span className="text-[10px] text-slate-400">Rankings based on Elo ratings</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">Team</th>
              <th className="text-right pb-2 font-medium">Elo</th>
              <th className="text-right pb-2 font-medium">W</th>
              <th className="text-right pb-2 font-medium">D</th>
              <th className="text-right pb-2 font-medium">L</th>
              <th className="text-right pb-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {[...teams].sort((a, b) => b.elo - a.elo).map((t, i) => (
              <tr key={t.code}>
                <td className="py-1.5 pr-2">
                  <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[9px] font-bold ${i < 2 ? 'bg-success/10 text-success' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                </td>
                <td className="py-1.5"><TeamBadge name={t.name} code={t.code} size="sm" /></td>
                <td className="py-1.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{t.elo}</td>
                <td className="py-1.5 text-right text-xs text-slate-400">0</td>
                <td className="py-1.5 text-right text-xs text-slate-400">0</td>
                <td className="py-1.5 text-right text-xs text-slate-400">0</td>
                <td className="py-1.5 text-right text-xs font-bold text-slate-400">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const standings = teams.map(t => ({
    team: t, played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0,
  }));

  for (const f of fixtures) {
    if (f.status !== 'completed' || f.homeScore === null || f.awayScore === null) continue;
    const home = standings.find(s => s.team.code === f.home);
    const away = standings.find(s => s.team.code === f.away);
    if (!home || !away) continue;

    home.played++; away.played++;
    home.goalsFor += f.homeScore; home.goalsAgainst += f.awayScore;
    away.goalsFor += f.awayScore; away.goalsAgainst += f.homeScore;

    if (f.homeScore > f.awayScore) { home.won++; home.points += 3; away.lost++; }
    else if (f.homeScore === f.awayScore) { home.drawn++; home.points += 1; away.drawn++; away.points += 1; }
    else { away.won++; away.points += 3; home.lost++; }
  }

  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst;
    if (gdA !== gdB) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
          <th className="text-left pb-2 font-medium">#</th>
          <th className="text-left pb-2 font-medium">Team</th>
          <th className="text-right pb-2 font-medium">P</th>
          <th className="text-right pb-2 font-medium">W</th>
          <th className="text-right pb-2 font-medium">D</th>
          <th className="text-right pb-2 font-medium">L</th>
          <th className="text-right pb-2 font-medium">GF</th>
          <th className="text-right pb-2 font-medium">GA</th>
          <th className="text-right pb-2 font-medium">GD</th>
          <th className="text-right pb-2 font-medium">Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.team.code} className={i < 2 ? 'bg-success/5' : ''}>
            <td className="py-1.5 pr-2">
              <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[9px] font-bold ${i < 2 ? 'bg-success/10 text-success' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{i + 1}</span>
            </td>
            <td className="py-1.5"><TeamBadge name={s.team.name} code={s.team.code} size="sm" /></td>
            <td className="py-1.5 text-right text-xs">{s.played}</td>
            <td className="py-1.5 text-right text-xs">{s.won}</td>
            <td className="py-1.5 text-right text-xs">{s.drawn}</td>
            <td className="py-1.5 text-right text-xs">{s.lost}</td>
            <td className="py-1.5 text-right text-xs">{s.goalsFor}</td>
            <td className="py-1.5 text-right text-xs">{s.goalsAgainst}</td>
            <td className="py-1.5 text-right text-xs font-semibold">{s.goalsFor - s.goalsAgainst > 0 ? '+' : ''}{s.goalsFor - s.goalsAgainst}</td>
            <td className="py-1.5 text-right text-xs font-bold text-slate-800 dark:text-slate-200">{s.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FixturesTab({ fixtures }: { fixtures: MergedFixture[] }) {
  const hasResults = fixtures.some(f => f.status === 'completed');
  const hasLive = fixtures.some(f => f.status === 'live');

  return (
    <div>
      {!hasResults && !hasLive && (
        <div className="flex items-center gap-2 mb-3">
          <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">Pre-tournament</span>
          <span className="text-[10px] text-slate-400">Scheduled fixtures</span>
        </div>
      )}
      <div className="space-y-2">
        {fixtures.map(f => {
          const homeTeam = getTeamByCode(f.home);
          const awayTeam = getTeamByCode(f.away);
          const isLive = f.status === 'live';
          return (
            <div key={f.id} className={`flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 ${isLive ? 'bg-red-50/50 dark:bg-red-500/5 -mx-1 px-1 rounded-lg' : ''}`}>
              <span className="text-[10px] text-slate-400 w-8 shrink-0">MD{f.matchday}</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{homeTeam?.code || 'TBD'}</span>
                {f.status === 'completed' && f.homeScore !== null && f.awayScore !== null ? (
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.homeScore} - {f.awayScore}</span>
                ) : isLive && f.homeScore !== null && f.awayScore !== null ? (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{f.homeScore} - {f.awayScore}{f.matchMinute ? ` ${f.matchMinute}'` : ''}</span>
                ) : (
                  <span className="text-[10px] text-slate-400">vs</span>
                )}
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{awayTeam?.code || 'TBD'}</span>
                {isLive && <span className="badge bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-[8px]">LIVE</span>}
              </div>
              {isLive ? (
                <span className="text-[10px] text-red-500 font-medium shrink-0">{f.statusDetail || 'Live'}</span>
              ) : (
                <span className="text-[10px] text-slate-400 shrink-0">{f.status === 'completed' ? 'FT' : `${toNepalTime(f.date, f.timeUTC)} NPT`}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProbabilitiesTab({ simData }: { simData: GroupProbabilities[] }) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
            <th className="text-left pb-2 font-medium">#</th>
            <th className="text-left pb-2 font-medium">Team</th>
            <th className="text-right pb-2 font-medium">1st</th>
            <th className="text-right pb-2 font-medium">2nd</th>
            <th className="text-right pb-2 font-medium">3rd</th>
            <th className="text-right pb-2 font-medium">4th</th>
            <th className="text-right pb-2 font-medium">Advance</th>
          </tr>
        </thead>
        <tbody>
          {[...simData]
            .sort((a, b) => b.pAdvance - a.pAdvance)
            .map((td, idx) => (
              <tr key={td.team.code} className={idx < 2 ? 'bg-success/5' : ''}>
                <td className="py-1.5 pr-2">
                  <span className={`w-5 h-5 rounded inline-flex items-center justify-center text-[9px] font-bold ${
                    idx < 2 ? 'bg-success/10 text-success' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>{idx + 1}</span>
                </td>
                <td className="py-1.5">
                  <TeamBadge name={td.team.name} code={td.team.code} size="sm" />
                </td>
                <td className="py-1.5 text-right">
                  <span className={`text-xs font-semibold ${td.p1st > 30 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {td.p1st.toFixed(1)}%
                  </span>
                </td>
                <td className="py-1.5 text-right">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{td.p2nd.toFixed(1)}%</span>
                </td>
                <td className="py-1.5 text-right">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{td.p3rd.toFixed(1)}%</span>
                </td>
                <td className="py-1.5 text-right">
                  <span className="text-xs font-medium text-slate-400">{td.p4th.toFixed(1)}%</span>
                </td>
                <td className="py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${td.pAdvance > 50 ? 'bg-success' : td.pAdvance > 25 ? 'bg-brand-500' : 'bg-slate-400'}`}
                        style={{ width: `${Math.min(td.pAdvance, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${
                      td.pAdvance > 50 ? 'text-success' : td.pAdvance > 25 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                    }`}>{td.pAdvance.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Groups() {
  const sim = useMemo(() => simulateGroupStage(DEFAULT_SIMULATION_RUNS, SIMULATION_SEED), []);
  const { fixtures: allFixtures } = useWC2026Fixtures();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Groups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">World Cup 2026 group stage standings, fixtures, and probabilities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{sim.simulationRuns.toLocaleString()} runs</span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg px-2.5 py-1.5">{sim.modelVersion}</span>
        </div>
      </div>

      <RoundedCard hover={false} className="bg-brand-50/50 dark:bg-brand-500/5 border-brand-200/50 dark:border-brand-500/20">
        <div className="flex items-start gap-3">
          <Grid3X3 className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">2026 Advancement Format</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              12 groups of 4 teams. Top 2 from each group (24 teams) + 8 best 3rd-place teams advance to Round of 32.
              Each group card has tabs for standings, fixtures, and probabilities.
            </p>
          </div>
        </div>
      </RoundedCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {GROUP_NAMES.map(g => (
          <GroupCard key={g} group={g} simData={sim.groups[g]} allFixtures={allFixtures} />
        ))}
      </div>

      <RoundedCard hover={false}>
        <SectionHeader title="Knockout Advancement Probability" subtitle="All 48 teams ranked by chance of reaching Round of 32" icon={<Grid3X3 className="w-5 h-5" />} />
        <div className="mt-4 space-y-2">
          {Object.values(sim.groups)
            .flat()
            .sort((a, b) => b.pAdvance - a.pAdvance)
            .slice(0, 16)
            .map((td, i) => (
              <div key={td.team.code} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  i < 8 ? 'bg-success/10 text-success dark:bg-success/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
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
              </div>
            ))}
        </div>
      </RoundedCard>

      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 py-2">
        <span>Model: {sim.modelVersion}</span>
        <span>|</span>
        <span>Runs: {sim.simulationRuns.toLocaleString()}</span>
        <span>|</span>
        <span>Seeded PRNG (deterministic)</span>
      </div>
    </div>
  );
}
