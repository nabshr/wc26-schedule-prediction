export interface WC2026Team {
  name: string;
  code: string;
  confederation: string;
  group: string;
  pot: number;
  elo: number;
}

export const WC2026_TEAMS: WC2026Team[] = [
  { name: 'Mexico', code: 'MEX', confederation: 'CONCACAF', group: 'A', pot: 1, elo: 1680 },
  { name: 'Czechia', code: 'CZE', confederation: 'UEFA', group: 'A', pot: 2, elo: 1720 },
  { name: 'South Africa', code: 'RSA', confederation: 'CAF', group: 'A', pot: 3, elo: 1530 },
  { name: 'Korea Republic', code: 'KOR', confederation: 'AFC', group: 'A', pot: 4, elo: 1640 },

  { name: 'Canada', code: 'CAN', confederation: 'CONCACAF', group: 'B', pot: 1, elo: 1650 },
  { name: 'Switzerland', code: 'SUI', confederation: 'UEFA', group: 'B', pot: 2, elo: 1770 },
  { name: 'Qatar', code: 'QAT', confederation: 'AFC', group: 'B', pot: 3, elo: 1540 },
  { name: 'Bosnia and Herzegovina', code: 'BIH', confederation: 'UEFA', group: 'B', pot: 4, elo: 1570 },

  { name: 'Brazil', code: 'BRA', confederation: 'CONMEBOL', group: 'C', pot: 1, elo: 1940 },
  { name: 'Scotland', code: 'SCO', confederation: 'UEFA', group: 'C', pot: 2, elo: 1660 },
  { name: 'Morocco', code: 'MAR', confederation: 'CAF', group: 'C', pot: 3, elo: 1730 },
  { name: 'Haiti', code: 'HAI', confederation: 'CONCACAF', group: 'C', pot: 4, elo: 1420 },

  { name: 'USA', code: 'USA', confederation: 'CONCACAF', group: 'D', pot: 1, elo: 1730 },
  { name: 'Turkey', code: 'TUR', confederation: 'UEFA', group: 'D', pot: 2, elo: 1700 },
  { name: 'Paraguay', code: 'PAR', confederation: 'CONMEBOL', group: 'D', pot: 3, elo: 1610 },
  { name: 'Australia', code: 'AUS', confederation: 'AFC', group: 'D', pot: 4, elo: 1580 },

  { name: 'Germany', code: 'GER', confederation: 'UEFA', group: 'E', pot: 1, elo: 1900 },
  { name: 'Ecuador', code: 'ECU', confederation: 'CONMEBOL', group: 'E', pot: 2, elo: 1650 },
  { name: 'Côte d\'Ivoire', code: 'CIV', confederation: 'CAF', group: 'E', pot: 3, elo: 1600 },
  { name: 'Curacao', code: 'CUW', confederation: 'CONCACAF', group: 'E', pot: 4, elo: 1380 },

  { name: 'Netherlands', code: 'NED', confederation: 'UEFA', group: 'F', pot: 1, elo: 1870 },
  { name: 'Sweden', code: 'SWE', confederation: 'UEFA', group: 'F', pot: 2, elo: 1680 },
  { name: 'Tunisia', code: 'TUN', confederation: 'CAF', group: 'F', pot: 3, elo: 1560 },
  { name: 'Japan', code: 'JPN', confederation: 'AFC', group: 'F', pot: 4, elo: 1660 },

  { name: 'Belgium', code: 'BEL', confederation: 'UEFA', group: 'G', pot: 1, elo: 1840 },
  { name: 'Iran', code: 'IRN', confederation: 'AFC', group: 'G', pot: 2, elo: 1600 },
  { name: 'Egypt', code: 'EGY', confederation: 'CAF', group: 'G', pot: 3, elo: 1570 },
  { name: 'New Zealand', code: 'NZL', confederation: 'OFC', group: 'G', pot: 4, elo: 1450 },

  { name: 'Spain', code: 'ESP', confederation: 'UEFA', group: 'H', pot: 1, elo: 1920 },
  { name: 'Uruguay', code: 'URU', confederation: 'CONMEBOL', group: 'H', pot: 2, elo: 1790 },
  { name: 'Saudi Arabia', code: 'KSA', confederation: 'AFC', group: 'H', pot: 3, elo: 1550 },
  { name: 'Cabo Verde', code: 'CPV', confederation: 'CAF', group: 'H', pot: 4, elo: 1480 },

  { name: 'France', code: 'FRA', confederation: 'UEFA', group: 'I', pot: 1, elo: 1970 },
  { name: 'Norway', code: 'NOR', confederation: 'UEFA', group: 'I', pot: 2, elo: 1670 },
  { name: 'Senegal', code: 'SEN', confederation: 'CAF', group: 'I', pot: 3, elo: 1630 },
  { name: 'Iraq', code: 'IRQ', confederation: 'AFC', group: 'I', pot: 4, elo: 1500 },

  { name: 'Argentina', code: 'ARG', confederation: 'CONMEBOL', group: 'J', pot: 1, elo: 1960 },
  { name: 'Austria', code: 'AUT', confederation: 'UEFA', group: 'J', pot: 2, elo: 1690 },
  { name: 'Algeria', code: 'ALG', confederation: 'CAF', group: 'J', pot: 3, elo: 1550 },
  { name: 'Jordan', code: 'JOR', confederation: 'AFC', group: 'J', pot: 4, elo: 1460 },

  { name: 'Portugal', code: 'POR', confederation: 'UEFA', group: 'K', pot: 1, elo: 1880 },
  { name: 'Colombia', code: 'COL', confederation: 'CONMEBOL', group: 'K', pot: 2, elo: 1740 },
  { name: 'DR Congo', code: 'COD', confederation: 'CAF', group: 'K', pot: 3, elo: 1520 },
  { name: 'Uzbekistan', code: 'UZB', confederation: 'AFC', group: 'K', pot: 4, elo: 1470 },

  { name: 'England', code: 'ENG', confederation: 'UEFA', group: 'L', pot: 1, elo: 1910 },
  { name: 'Croatia', code: 'CRO', confederation: 'UEFA', group: 'L', pot: 2, elo: 1780 },
  { name: 'Ghana', code: 'GHA', confederation: 'CAF', group: 'L', pot: 3, elo: 1580 },
  { name: 'Panama', code: 'PAN', confederation: 'CONCACAF', group: 'L', pot: 4, elo: 1400 },
];

export const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export function getTeamsByGroup(group: string): WC2026Team[] {
  return WC2026_TEAMS.filter(t => t.group === group);
}

export function getTeamByCode(code: string): WC2026Team | undefined {
  return WC2026_TEAMS.find(t => t.code === code);
}

export function getTeamByName(name: string): WC2026Team | undefined {
  return WC2026_TEAMS.find(t => t.name === name);
}

export const TEAM_ALIASES: Record<string, string> = {
  'Korea Republic': 'South Korea',
  'Türkiye': 'Turkey',
  "Côte d'Ivoire": 'Ivory Coast',
  'IR Iran': 'Iran',
  'Congo DR': 'DR Congo',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
};

export function resolveTeamName(name: string): string {
  return TEAM_ALIASES[name] || name;
}

export const CONFEDERATION_META: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  UEFA: { label: 'UEFA', color: '#3B82F6', bgClass: 'bg-blue-100 dark:bg-blue-500/20', textClass: 'text-blue-700 dark:text-blue-400' },
  CONMEBOL: { label: 'CONMEBOL', color: '#10B981', bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-700 dark:text-emerald-400' },
  CAF: { label: 'CAF', color: '#F59E0B', bgClass: 'bg-amber-100 dark:bg-amber-500/20', textClass: 'text-amber-700 dark:text-amber-400' },
  AFC: { label: 'AFC', color: '#EF4444', bgClass: 'bg-red-100 dark:bg-red-500/20', textClass: 'text-red-700 dark:text-red-400' },
  CONCACAF: { label: 'CONCACAF', color: '#06B6D4', bgClass: 'bg-cyan-100 dark:bg-cyan-500/20', textClass: 'text-cyan-700 dark:text-cyan-400' },
  OFC: { label: 'OFC', color: '#8B5CF6', bgClass: 'bg-violet-100 dark:bg-violet-500/20', textClass: 'text-violet-700 dark:text-violet-400' },
};
