import CountryFlag from './CountryFlag';

interface TeamBadgeProps {
  name: string;
  code?: string;
  /** @deprecated – flag prop is ignored; flags now come from CountryFlag */
  flag?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const sizeMap = {
  sm: { flagSize: 18, gap: 'gap-1.5', text: 'text-xs' },
  md: { flagSize: 22, gap: 'gap-2',   text: 'text-sm' },
  lg: { flagSize: 28, gap: 'gap-2.5', text: 'text-base' },
};

/**
 * Displays a team's flag + name (or flag only when showName=false).
 * Flag rendering is delegated to CountryFlag → react-country-flag (SVG).
 */
export default function TeamBadge({ name, code, size = 'md', showName = true }: TeamBadgeProps) {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      {code ? (
        <CountryFlag code={code} size={s.flagSize} decorative countryName={name} />
      ) : (
        /* Fallback badge when no code is available */
        <span className={`
          inline-flex items-center justify-center rounded-sm
          bg-slate-100 dark:bg-slate-700
          text-slate-500 dark:text-slate-300
          font-bold text-[9px] shrink-0 border border-slate-200 dark:border-slate-600
        `} style={{ width: s.flagSize * 1.33, height: s.flagSize }}>
          {name.slice(0, 3).toUpperCase()}
        </span>
      )}
      {showName && (
        <span className={`${s.text} font-medium text-slate-800 dark:text-slate-200`}>
          {name}
        </span>
      )}
    </div>
  );
}
