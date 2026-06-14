import { BookOpen, Cpu, BarChart3, Zap } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';

export default function Methodology() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Methodology</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">How the prediction model works</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassPanel>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Model Architecture</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Prediction engine architecture details will be documented here. The model combines team ratings, form analysis, historical performance, and tournament-specific factors.
          </p>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 dark:bg-gold-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gold-500 dark:text-gold-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Data Sources</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Data pipeline and source documentation will be provided here. Includes international match results, FIFA rankings, and competitive performance metrics.
          </p>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent dark:text-accent-light" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Simulation Method</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Monte Carlo simulation methodology details will be documented here. Thousands of tournament runs generate probability distributions for each outcome.
          </p>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 dark:bg-success/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-success" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Validation</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Model validation and backtesting methodology will be described here. Historical accuracy metrics and calibration analysis ensure reliability.
          </p>
        </GlassPanel>
      </div>

      <RoundedCard>
        <SectionHeader title="Technical Documentation" icon={<BookOpen className="w-5 h-5" />} />
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Full technical documentation will be available when the model is implemented.</p>
        </div>
      </RoundedCard>
    </div>
  );
}
