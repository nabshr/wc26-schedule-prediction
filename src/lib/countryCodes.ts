/**
 * Maps WC 2026 three-letter team codes → ISO 3166-1 alpha-2 codes
 * used by react-country-flag (and standard SVG flag libraries).
 *
 * Non-standard FIFA codes that differ from ISO alpha-2:
 *   KSA → SA   (Saudi Arabia)
 *   ALG → DZ   (Algeria)
 *   CPV → CV   (Cabo Verde)
 *   COD → CD   (DR Congo)
 *   HAI → HT   (Haiti)
 *   SCO → GB-SCT  (Scotland — uses GB-SCT subdivision code)
 *   ENG → GB-ENG  (England — uses GB-ENG subdivision code)
 *   CIV → CI   (Côte d'Ivoire)
 *   CUW → CW   (Curaçao)
 *   RSA → ZA   (South Africa)
 *   BIH → BA   (Bosnia and Herzegovina)
 *   NED → NL   (Netherlands)
 *   GER → DE   (Germany)
 *   SUI → CH   (Switzerland)
 *   IRN → IR   (Iran)
 *   KOR → KR   (Korea Republic)
 *   POR → PT   (Portugal)
 *   URU → UY   (Uruguay)
 *   PAR → PY   (Paraguay)
 *   ECU → EC   (Ecuador)
 *   QAT → QA   (Qatar)
 *   IRQ → IQ   (Iraq)
 *   JOR → JO   (Jordan)
 *   UZB → UZ   (Uzbekistan)
 *   SEN → SN   (Senegal)
 *   NOR → NO   (Norway)
 *   TUN → TN   (Tunisia)
 *   TUR → TR   (Turkey)
 *   MAR → MA   (Morocco)
 *   NZL → NZ   (New Zealand)
 *   CZE → CZ   (Czechia)
 */
export const TEAM_CODE_TO_ISO: Record<string, string> = {
  // Group A
  MEX: 'MX',
  CZE: 'CZ',
  RSA: 'ZA',
  KOR: 'KR',

  // Group B
  CAN: 'CA',
  SUI: 'CH',
  QAT: 'QA',
  BIH: 'BA',

  // Group C
  BRA: 'BR',
  SCO: 'GB-SCT',
  MAR: 'MA',
  HAI: 'HT',

  // Group D
  USA: 'US',
  TUR: 'TR',
  PAR: 'PY',
  AUS: 'AU',

  // Group E
  GER: 'DE',
  ECU: 'EC',
  CIV: 'CI',
  CUW: 'CW',

  // Group F
  NED: 'NL',
  SWE: 'SE',
  TUN: 'TN',
  JPN: 'JP',

  // Group G
  BEL: 'BE',
  IRN: 'IR',
  EGY: 'EG',
  NZL: 'NZ',

  // Group H
  ESP: 'ES',
  URU: 'UY',
  KSA: 'SA',
  CPV: 'CV',

  // Group I
  FRA: 'FR',
  NOR: 'NO',
  SEN: 'SN',
  IRQ: 'IQ',

  // Group J
  ARG: 'AR',
  AUT: 'AT',
  ALG: 'DZ',
  JOR: 'JO',

  // Group K
  POR: 'PT',
  COL: 'CO',
  COD: 'CD',
  UZB: 'UZ',

  // Group L
  ENG: 'GB-ENG',
  CRO: 'HR',
  GHA: 'GH',
  PAN: 'PA',
};

/**
 * Resolve an ISO alpha-2 code from either a WC team code or a country name.
 * Returns undefined if no mapping is found — callers should degrade gracefully.
 */
export function resolveIsoCode(teamCode?: string): string | undefined {
  if (!teamCode) return undefined;
  return TEAM_CODE_TO_ISO[teamCode.toUpperCase()];
}