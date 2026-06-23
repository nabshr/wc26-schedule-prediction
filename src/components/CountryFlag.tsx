import ReactCountryFlag from 'react-country-flag';
import { resolveIsoCode } from '../lib/countryCodes';

export interface CountryFlagProps {
  /** WC 2026 three-letter team code, e.g. "FRA", "KSA" */
  code: string;
  /** Display size in px (applied to both width & height). Defaults to 20. */
  size?: number;
  /** Extra class names for the <span> wrapper */
  className?: string;
  /** Country name used for the aria-label / title */
  countryName?: string;
  /**
   * When true the flag is treated as decorative (aria-hidden).
   * Use this when the adjacent text already conveys the country name.
   */
  decorative?: boolean;
}

/**
 * Renders an SVG country flag for the given WC team code.
 * Falls back silently to nothing if the code is unknown or "TBD".
 */
export default function CountryFlag({
  code,
  size = 20,
  className = '',
  countryName,
  decorative = true,
}: CountryFlagProps) {
  const isoCode = resolveIsoCode(code);

  // Graceful no-op for TBD / unknown codes
  if (!isoCode) return null;

  const label = countryName ? `${countryName} flag` : `${code} flag`;

  return (
    <span
      className={`inline-flex items-center shrink-0 overflow-hidden rounded-[2px] ${className}`}
      style={{ width: size * 1.33, height: size, lineHeight: 0 }}
      aria-hidden={decorative ? 'true' : undefined}
      title={decorative ? undefined : label}
    >
      <ReactCountryFlag
        countryCode={isoCode}
        svg
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        aria-label={decorative ? undefined : label}
      />
    </span>
  );
}