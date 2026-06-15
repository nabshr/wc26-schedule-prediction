import { CalendarClock } from 'lucide-react';
import { useMemo } from 'react';
import GlassPanel from './GlassPanel';
import SectionHeader from './SectionHeader';
import TeamBadge from './TeamBadge';
import { useWC2026Fixtures } from '../lib/useWC2026Fixtures';
import { getTeamByCode } from '../data/worldCup2026';
import { predictMatch } from '../lib/prediction';
import { STAGE_LABELS } from '../data/fixtures2026';

function formatDateTime(date: string, timeUTC: string) {
  if (!date || !timeUTC) return '';
  const dt = new Date(`${date}T${timeUTC}:00Z`);
  const dateStr = dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = dt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${timeStr}`;
}

export default function UpcomingMatches() {
  const { fixtures, loading } = useWC2026Fixtures();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter(f => f.status === 'scheduled' && f.date && f.timeUTC)
      .map(f => ({
        ...f,
        kickoffTs: new Date(`${f.date}T${f.timeUTC}:00Z`).getTime(),
      }))
      .filter(f => f.kickoffTs >= now)
      .sort((a, b) => a.kickoffTs - b.kickoffTs)
      .slice(0, 5);
  }, [fixtures]);

  return (
    <GlassPanel>
      <SectionHeader
        title="Upcoming Matches"
        subtitle="Next 5 fixtures with model predictions"
        icon={<CalendarClock className="w-5 h-5" />}
      />
      <div className="space-y-3 mt-4">
        {loading && (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading fixtures…</div>
        )}

        {!loading && upcoming.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">No upcoming matches found.</div>
        )}

        {!loading && upcoming.map(f => {
          const homeTeam = getTeamByCode(f.home);
          const awayTeam = getTeamByCode(f.away);
          const prediction = homeTeam && awayTeam ? predictMatch(homeTeam, awayTeam, 'neutral') : null;

          return (
            <div
              key={f.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {STAGE_LABELS[f.stage] || f.stage}
                  {f.group ? ` · Group ${f.group}` : ''}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDateTime(f.date, f.timeUTC)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                {homeTeam ? (
                  <TeamBadge name={homeTeam.name} code={homeTeam.code} size="sm" />
                ) : (
                  <span className="text-sm font-medium text-slate-500">{f.home || 'TBD'}</span>
                )}
                <span className="text-xs font-semibold text-slate-400 px-2">vs</span>
                {awayTeam ? (
                  <TeamBadge name={awayTeam.name} code={awayTeam.code} size="sm" />
                ) : (
                  <span className="text-sm font-medium text-slate-500">{f.away || 'TBD'}</span>
                )}
              </div>

              {prediction && (
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${prediction.teamAWinProb}%` }}
                    />
                    <div
                      className="h-full bg-slate-400"
                      style={{ width: `${prediction.drawProb}%` }}
                    />
                    <div
                      className="h-full bg-gold-500"
                      style={{ width: `${prediction.teamBWinProb}%` }}
                    />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {prediction.teamAWinProb.toFixed(0)}% / {prediction.drawProb.toFixed(0)}% / {prediction.teamBWinProb.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}