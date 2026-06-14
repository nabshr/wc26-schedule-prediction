interface TeamBadgeProps {
  name: string;
  code?: string;
  flag?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const sizeMap = {
  sm: { badge: 'w-7 h-7 text-xs', text: 'text-xs' },
  md: { badge: 'w-9 h-9 text-sm', text: 'text-sm' },
  lg: { badge: 'w-11 h-11 text-base', text: 'text-base' },
};

export default function TeamBadge({ name, code, flag, size = 'md', showName = true }: TeamBadgeProps) {
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-2">
      <div className={`${s.badge} rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600`}>
        {flag || code || name.slice(0, 3).toUpperCase()}
      </div>
      {showName && <span className={`${s.text} font-medium text-slate-800 dark:text-slate-200`}>{name}</span>}
    </div>
  );
}
