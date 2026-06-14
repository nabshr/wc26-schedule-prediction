interface ProbabilityBarProps {
  label: string;
  value: number;
  color?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'h-5', md: 'h-7', lg: 'h-9' };

export default function ProbabilityBar({
  label,
  value,
  color = 'bg-brand-500',
  showPercent = true,
  size = 'md',
}: ProbabilityBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-24 truncate">{label}</span>
      <div className={`flex-1 ${sizeMap[size]} rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 relative`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
        {showPercent && (
          <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-slate-800 dark:text-white mix-blend-multiply dark:mix-blend-normal">
            {value.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
