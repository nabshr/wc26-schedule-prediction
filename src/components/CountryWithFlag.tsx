import CountryFlag from './CountryFlag';

export interface CountryWithFlagProps {
  /** Display name of the country/team, e.g. "France" */
  name: string;
  /**
   * WC 2026 three-letter team code, e.g. "FRA".
   * If omitted the flag is not shown but the name still renders.
   */
  code?: string;
  /** When true, only the flag is rendered (no name text). Defaults to false. */
  flagOnly?: boolean;
  /** Flag size in px. Defaults to 18. */
  flagSize?: number;
  /** Extra class names on the root element */
  className?: string;
  /** Extra class names on the flag <span> */
  flagClassName?: string;
  /** Extra class names on the name <span> */
  nameClassName?: string;
}

/**
 * Renders a flag icon alongside (or instead of) a country name.
 *
 * Usage examples:
 *   <CountryWithFlag name="France" code="FRA" />
 *   <CountryWithFlag name="France" code="FRA" flagOnly />
 *   <CountryWithFlag name="France" code="FRA" flagSize={24} className="gap-2" />
 *
 * Accessibility:
 *   - The flag is decorative (aria-hidden) because the adjacent name text
 *     already communicates the country.
 *   - In flagOnly mode the <span> wrapper carries an aria-label with the name.
 */
export default function CountryWithFlag({
  name,
  code,
  flagOnly = false,
  flagSize = 18,
  className = '',
  flagClassName = '',
  nameClassName = '',
}: CountryWithFlagProps) {
  if (flagOnly) {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        aria-label={name}
        title={name}
      >
        {code && (
          <CountryFlag
            code={code}
            size={flagSize}
            className={flagClassName}
            decorative={false}
            countryName={name}
          />
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {code && (
        <CountryFlag
          code={code}
          size={flagSize}
          className={flagClassName}
          decorative
        />
      )}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}