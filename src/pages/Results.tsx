import { BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import TeamBadge from '../components/TeamBadge';
import { getTeamByCode } from '../data/worldCup2026';
import { STAGE_LABELS } from '../data/fixtures2026';
import { useWC2026Fixtures, type MergedFixture } from '../lib/useWC2026Fixtures';
import { predictMatch } from '../lib/prediction';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

type Outcome = 'homeWin' | 'draw' | 'awayWin';

function getOutcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return 'homeWin';
  if (homeScore < awayScore) return 'awayWin';
  return 'draw';
}

interface GradedMatch {
  fixture: MergedFixture;
  prediction: ReturnType<typeof predictMatch> | null;
  actualOutcome: Outcome;
  calledCorrectly: boolean | null;
  confidence: number | null;
}

export default function Results() {
  const { fixtures, lastFixtureSync } = useWC2026Fixtures();

  const completedMatches = useMemo(
    () => fixtures.filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null),
    [fixtures]
  );

  const graded = useMemo<GradedMatch[]>(() => {
    return completedMatches.map(f => {
      const homeTeam = getTeamByCode(f.home);
      const awayTeam = getTeamByCode(f.away);
      let prediction: ReturnType<typeof predictMatch> | null = null;
      let actualOutcome: Outcome = getOutcome(f.homeScore!, f.awayScore!);
      let calledCorrectly: boolean | null = null;
      let confidence: number | null = null;

      if (homeTeam && awayTeam) {
        prediction = predictMatch(homeTeam, awayTeam, 'neutral');
        const predictedOutcome: Outcome =
          prediction.teamAWinProb > prediction.drawProb && prediction.teamAWinProb > prediction.teamBWinProb
            ? 'homeWin'
            : prediction.drawProb > prediction.teamBWinProb
            ? 'draw'
            : 'awayWin';

        calledCorrectly = predictedOutcome === actualOutcome;
        confidence = Math.max(prediction.teamAWinProb, prediction.drawProb, prediction.teamBWinProb);
      }

      return { fixture: f, prediction, actualOutcome, calledCorrectly, confidence };
    });
  }, [completedMatches]);

  const correctCount = graded.filter(g => g.calledCorrectly === true).length;
  const totalGraded = graded.length;
  const hitRate = totalGraded > 0 ? (correctCount / totalGraded) * 100 : 0;
  const syncedAt = lastFixtureSync?.finished_at;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Results</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tournament results and prediction outcomes</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="badge badge-success">{completedMatches.length} completed</span>
          <span className="text-slate-500 dark:text-slate-400">
            Hit rate: <span className="font-semibold text-slate-700 dark:text-slate-200">{hitRate.toFixed(0)}%</span>
          </span>
          {syncedAt && (
            <span className="text-[9px] text-slate-400">
              Synced {new Date(syncedAt).toLocaleTimeString('en-US', { hour12: false })}
            </span>
          )}
        </div>
      </div>

      {graded.length === 0 ? (
        <RoundedCard hover={false}>
          <div className="py-16 flex flex-col items-center text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No completed matches yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Results and prediction grading will appear here as matches finish. Use Admin &gt; Sync Fixtures to pull live data.
            </p>
          </div>
        </RoundedCard>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Correct calls</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalGraded - correctCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Wrong calls</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-center">
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{hitRate.toFixed(0)}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hit rate</p>
            </div>
          </div>

          <RoundedCard className="!p-0 overflow-hidden" hover={false}>
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
              <SectionHeader title="Match Results" subtitle={`${totalGraded} graded matches`} icon={<BarChart3 className="w-5 h-5" />} />
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match</th>
                    <th>Score</th>
                    <th>Predicted</th>
                    <th>Confidence</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {graded.map(g => {
                    const f = g.fixture;
                    const homeTeam = getTeamByCode(f.home);
                    const awayTeam = getTeamByCode(f.away);
                    return (
                      <tr key={f.id}>
                        <td className="text-xs text-slate-500 dark:text-slate-400">{formatDate(f.date)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {homeTeam ? <TeamBadge name={homeTeam.name} code={homeTeam.code} size="sm" /> : <span className="text-xs text-slate-400">{f.home}</span>}
                            <span className="text-xs text-slate-400">vs</span>
                            {awayTeam ? <TeamBadge name={awayTeam.name} code={awayTeam.code} size="sm" /> : <span className="text-xs text-slate-400">{f.away}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.homeScore} - {f.awayScore}</span>
                        </td>
                        <td>
                          {g.prediction ? (
                            <div className="text-xs">
                              <span className={g.actualOutcome === 'homeWin' ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-500'}>
                                {g.prediction.teamAWinProb.toFixed(0)}%
                              </span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className={g.actualOutcome === 'draw' ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-500'}>
                                {g.prediction.drawProb.toFixed(0)}%
                              </span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className={g.actualOutcome === 'awayWin' ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-500'}>
                                {g.prediction.teamBWinProb.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                        <td>
                          {g.confidence !== null ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${g.confidence > 50 ? 'bg-brand-500' : 'bg-slate-400'}`}
                                  style={{ width: `${Math.min(g.confidence, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{g.confidence.toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>
                        <td>
                          {g.calledCorrectly === null ? (
                            <span className="text-xs text-slate-400">--</span>
                          ) : g.calledCorrectly ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                              <XCircle className="w-3.5 h-3.5" /> Wrong
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </RoundedCard>
        </>
      )}
    </div>
  );
}
