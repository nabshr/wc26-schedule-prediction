import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: string; trend: 'up' | 'down' | 'neutral' };
  icon?: ReactNode;
  accent?: 'brand' | 'gold' | 'success' | 'error' | 'accent';
}

const accentMap = {
  brand: 'from-brand-500/20 to-brand-600/5 text-brand-500 dark:text-brand-400',
  gold: 'from-gold-500/20 to-gold-600/5 text-gold-500 dark:text-gold-400',
  success: 'from-emerald-500/20 to-emerald-600/5 text-emerald-500 dark:text-emerald-400',
  error: 'from-red-500/20 to-red-600/5 text-red-500 dark:text-red-400',
  accent: 'from-accent/20 to-accent/5 text-accent dark:text-accent-light',
};

export default function StatCard({ label, value, change, icon, accent = 'brand' }: StatCardProps) {
  const TrendIcon = change?.trend === 'up' ? TrendingUp : change?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = change?.trend === 'up' ? 'text-success' : change?.trend === 'down' ? 'text-error' : 'text-slate-400';

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className="section-subheader">{label}</span>
        {icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{change.value}</span>
        </div>
      )}
    </div>
  );
}
