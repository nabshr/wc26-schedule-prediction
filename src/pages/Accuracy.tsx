import { Target, TrendingUp, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import EmptyState from '../components/EmptyState';
import { getTeamByCode } from '../data/worldCup2026';
import { WC2026_FIXTURES } from '../data/fixtures2026';
import { predictMatch } from '../lib/prediction';

type Outcome = 'homeWin' | 'draw' | 'awayWin';

function getOutcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return 'homeWin';
  if (homeScore < awayScore) return 'awayWin';
  return 'draw';
}

interface GradedResult {
  predictedProbs: { homeWin: number; draw: number; awayWin: number };
  actualOutcome: Outcome;
  correct: boolean;
}

function computeMetrics(results: GradedResult[]) {
  if (results.length === 0) return null;

  const hitRate = results.filter(r => r.correct).length / results.length;

  // Brier score: mean of sum of (predicted_i - actual_i)^2 over 3 outcomes
  let brierSum = 0;
  let logLossSum = 0;
  const eps = 1e-15;

  for (const r of results) {
    const actual = {
      homeWin: r.actualOutcome === 'homeWin' ? 1 : 0,
      draw: r.actualOutcome === 'draw' ? 1 : 0,
      awayWin: r.actualOutcome === 'awayWin' ? 1 : 0,
    };

    // Brier
    brierSum += (r.predictedProbs.homeWin - actual.homeWin) ** 2
              + (r.predictedProbs.draw - actual.draw) ** 2
              + (r.predictedProbs.awayWin - actual.awayWin) ** 2;

    // Log loss using probability of actual outcome
    const pActual = r.actualOutcome === 'homeWin' ? r.predictedProbs.homeWin
                  : r.actualOutcome === 'draw' ? r.predictedProbs.draw
                  : r.predictedProbs.awayWin;
    logLossSum -= Math.log(Math.max(pActual, eps));
  }

  const brierScore = brierSum / results.length;
  const logLoss = logLossSum / results.length;

  // Calibration buckets: group predictions by predicted probability bins
  // For each match, take the max predicted probability and whether it was correct
  const buckets: { range: string; predicted: number; actual: number; count: number }[] = [];
  const binSize = 0.1;
  for (let lo = 0; lo < 1; lo += binSize) {
    const hi = lo + binSize;
    const inBin = results.filter(r => {
      const maxP = Math.max(r.predictedProbs.homeWin, r.predictedProbs.draw, r.predictedProbs.awayWin);
      return maxP >= lo && maxP < hi;
    });
    if (inBin.length > 0) {
      const avgPred = inBin.reduce((s, r) => s + Math.max(r.predictedProbs.homeWin, r.predictedProbs.draw, r.predictedProbs.awayWin), 0) / inBin.length;
      const avgActual = inBin.filter(r => r.correct).length / inBin.length;
      buckets.push({ range: `${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}%`, predicted: avgPred, actual: avgActual, count: inBin.length });
    }
  }

  return { hitRate, brierScore, logLoss, buckets, totalMatches: results.length };
}

export default function Accuracy() {
  const gradedResults = useMemo<GradedResult[]>(() => {
    const completed = WC2026_FIXTURES.filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null);
    return completed.map(f => {
      const homeTeam = getTeamByCode(f.home);
      const awayTeam = getTeamByCode(f.away);
      if (!homeTeam || !awayTeam) return null;

      const pred = predictMatch(homeTeam, awayTeam, 'neutral');
      const actualOutcome = getOutcome(f.homeScore!, f.awayScore!);
      const predictedOutcome: Outcome =
        pred.teamAWinProb > pred.drawProb && pred.teamAWinProb > pred.teamBWinProb
          ? 'homeWin'
          : pred.drawProb > pred.teamBWinProb
          ? 'draw'
          : 'awayWin';

      return {
        predictedProbs: {
          homeWin: pred.teamAWinProb / 100,
          draw: pred.drawProb / 100,
          awayWin: pred.teamBWinProb / 100,
        },
        actualOutcome,
        correct: predictedOutcome === actualOutcome,
      };
    }).filter((r): r is GradedResult => r !== null);
  }, []);

  const metrics = useMemo(() => computeMetrics(gradedResults), [gradedResults]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accuracy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Prediction accuracy metrics and model performance tracking</p>
      </div>

      {metrics ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Overall Hit Rate" value={`${(metrics.hitRate * 100).toFixed(0)}%`} icon={<Target className="w-5 h-5" />} accent="success" />
            <StatCard label="Brier Score" value={metrics.brierScore.toFixed(3)} icon={<Target className="w-5 h-5" />} accent="brand" />
            <StatCard label="Log Loss" value={metrics.logLoss.toFixed(3)} icon={<Target className="w-5 h-5" />} accent="accent" />
            <StatCard label="Matches Graded" value={metrics.totalMatches.toString()} icon={<BarChart3 className="w-5 h-5" />} accent="gold" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Calibration curve */}
            <GlassPanel>
              <SectionHeader title="Calibration Curve" subtitle="Predicted probability vs observed frequency" icon={<TrendingUp className="w-5 h-5" />} />
              <div className="mt-4">
                {metrics.buckets.length > 0 ? (
                  <div className="space-y-3">
                    {/* Perfect calibration line reference */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                      <div className="w-3 h-0.5 bg-slate-300 dark:bg-slate-600 border-dashed" />
                      <span>Perfect calibration</span>
                      <div className="w-3 h-0.5 bg-brand-500" />
                      <span>Observed</span>
                    </div>
                    {metrics.buckets.map(b => (
                      <div key={b.range}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{b.range} <span className="text-slate-400">({b.count} matches)</span></span>
                          <span className="text-xs text-slate-500">Predicted {(b.predicted * 100).toFixed(0)}% / Actual {(b.actual * 100).toFixed(0)}%</span>
                        </div>
                        <div className="relative h-4 rounded bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                          {/* Perfect calibration reference */}
                          <div className="absolute inset-y-0 left-0 bg-slate-200 dark:bg-slate-600 rounded" style={{ width: `${b.predicted * 100}%` }} />
                          {/* Actual observation */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded ${Math.abs(b.actual - b.predicted) < 0.1 ? 'bg-success' : Math.abs(b.actual - b.predicted) < 0.2 ? 'bg-brand-500' : 'bg-amber-500'}`}
                            style={{ width: `${b.actual * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<TrendingUp className="w-8 h-8 text-slate-400" />}
                    title="Not enough data"
                    description="Calibration requires more completed matches to build bins."
                  />
                )}
              </div>
            </GlassPanel>

            {/* Metrics explanation */}
            <GlassPanel>
              <SectionHeader title="Metrics Explained" subtitle="How to read these scores" icon={<Target className="w-5 h-5" />} />
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hit Rate</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Percentage of matches where the model's most likely outcome matched the actual result. Currently {(metrics.hitRate * 100).toFixed(0)}%.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Brier Score</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Measures accuracy of predicted probabilities. Lower is better (0 = perfect, 0.66 = random for 3 outcomes). Current: {metrics.brierScore.toFixed(3)}.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Log Loss</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Penalizes overconfident wrong predictions heavily. Lower is better. Current: {metrics.logLoss.toFixed(3)}.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Calibration</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    When the model says 60% confidence, does it win about 60% of the time? Well-calibrated models match predicted vs observed rates.
                  </p>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Sample size warning */}
          {metrics.totalMatches < 20 && (
            <RoundedCard hover={false} className="bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Small Sample Size</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Only {metrics.totalMatches} matches graded. Metrics will stabilize as more matches are completed. Current numbers are preliminary and may not reflect true model performance.
                  </p>
                </div>
              </div>
            </RoundedCard>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Overall Accuracy" value="--" icon={<Target className="w-5 h-5" />} accent="success" />
            <StatCard label="Brier Score" value="--" icon={<Target className="w-5 h-5" />} accent="brand" />
            <StatCard label="Log Loss" value="--" icon={<Target className="w-5 h-5" />} accent="accent" />
            <StatCard label="Matches Graded" value="0" icon={<BarChart3 className="w-5 h-5" />} accent="gold" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RoundedCard>
              <SectionHeader title="Accuracy by Round" subtitle="Performance across tournament stages" icon={<Target className="w-5 h-5" />} />
              <EmptyState
                icon={<Target className="w-8 h-8 text-slate-400" />}
                title="Accuracy breakdown pending"
                description="Round-by-round accuracy will appear with match results. 0 completed matches graded so far."
              />
            </RoundedCard>

            <GlassPanel>
              <SectionHeader title="Calibration Curve" subtitle="Predicted vs actual outcomes" icon={<TrendingUp className="w-5 h-5" />} />
              <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                <EmptyState
                  icon={<TrendingUp className="w-8 h-8 text-slate-400" />}
                  title="Calibration chart pending"
                  description="Will render with prediction outcome data. Requires completed matches."
                />
              </div>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
