// Authoritative 2026 World Cup fixture/results data
// Source: FIFA official schedule + verified results from Yahoo Sports/ESPN
// All kickoff times in UTC. Convert to Nepal time (UTC+5:45) for display.

export interface WC2026Fixture {
  id: number;
  home: string; // team code
  away: string; // team code
  group: string;
  matchday: number;
  date: string; // YYYY-MM-DD
  timeUTC: string; // HH:mm UTC
  venue: string;
  city: string;
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'third';
  status: 'scheduled' | 'completed';
  homeScore: number | null;
  awayScore: number | null;
}

// Completed results from Matchday 1-2 (June 11-13)
// Scheduled fixtures from official FIFA schedule

export const WC2026_FIXTURES: WC2026Fixture[] = [
  // ─── GROUP A ────────────────────────────────────────────────
  // MD1
  { id: 1, home: 'MEX', away: 'RSA', group: 'A', matchday: 1, date: '2026-06-11', timeUTC: '19:00', venue: 'Estadio Azteca', city: 'Mexico City', stage: 'group', status: 'completed', homeScore: 2, awayScore: 0 },
  { id: 2, home: 'KOR', away: 'CZE', group: 'A', matchday: 1, date: '2026-06-11', timeUTC: '22:00', venue: 'Estadio Akron', city: 'Guadalajara', stage: 'group', status: 'completed', homeScore: 2, awayScore: 1 },
  // MD2
  { id: 73, home: 'CZE', away: 'RSA', group: 'A', matchday: 2, date: '2026-06-18', timeUTC: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 74, home: 'MEX', away: 'KOR', group: 'A', matchday: 2, date: '2026-06-18', timeUTC: '01:00', venue: 'Estadio Akron', city: 'Guadalajara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 97, home: 'CZE', away: 'MEX', group: 'A', matchday: 3, date: '2026-06-24', timeUTC: '01:00', venue: 'Estadio Azteca', city: 'Mexico City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 98, home: 'RSA', away: 'KOR', group: 'A', matchday: 3, date: '2026-06-24', timeUTC: '01:00', venue: 'Estadio BBVA', city: 'Monterrey', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP B ────────────────────────────────────────────────
  // MD1
  { id: 3, home: 'CAN', away: 'BIH', group: 'B', matchday: 1, date: '2026-06-12', timeUTC: '19:00', venue: 'BMO Field', city: 'Toronto', stage: 'group', status: 'completed', homeScore: 1, awayScore: 1 },
  { id: 4, home: 'SUI', away: 'QAT', group: 'B', matchday: 1, date: '2026-06-13', timeUTC: '19:00', venue: 'Lumen Field', city: 'Seattle', stage: 'group', status: 'completed', homeScore: 1, awayScore: 1 },
  // MD2
  { id: 75, home: 'SUI', away: 'BIH', group: 'B', matchday: 2, date: '2026-06-18', timeUTC: '19:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 76, home: 'CAN', away: 'QAT', group: 'B', matchday: 2, date: '2026-06-18', timeUTC: '22:00', venue: 'BC Place', city: 'Vancouver', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 99, home: 'SUI', away: 'CAN', group: 'B', matchday: 3, date: '2026-06-24', timeUTC: '19:00', venue: 'BC Place', city: 'Vancouver', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 100, home: 'BIH', away: 'QAT', group: 'B', matchday: 3, date: '2026-06-24', timeUTC: '19:00', venue: 'Lumen Field', city: 'Seattle', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP C ────────────────────────────────────────────────
  // MD1
  { id: 5, home: 'BRA', away: 'MAR', group: 'C', matchday: 1, date: '2026-06-13', timeUTC: '22:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'completed', homeScore: 1, awayScore: 1 },
  { id: 6, home: 'HAI', away: 'SCO', group: 'C', matchday: 1, date: '2026-06-14', timeUTC: '01:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'group', status: 'completed', homeScore: 0, awayScore: 1 },
  // MD2
  { id: 77, home: 'SCO', away: 'MAR', group: 'C', matchday: 2, date: '2026-06-19', timeUTC: '22:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 78, home: 'BRA', away: 'HAI', group: 'C', matchday: 2, date: '2026-06-20', timeUTC: '00:30', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 101, home: 'SCO', away: 'BRA', group: 'C', matchday: 3, date: '2026-06-24', timeUTC: '22:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 102, home: 'MAR', away: 'HAI', group: 'C', matchday: 3, date: '2026-06-24', timeUTC: '22:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP D ────────────────────────────────────────────────
  // MD1
  { id: 7, home: 'USA', away: 'PAR', group: 'D', matchday: 1, date: '2026-06-12', timeUTC: '03:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'group', status: 'completed', homeScore: 4, awayScore: 1 },
  { id: 8, home: 'AUS', away: 'TUR', group: 'D', matchday: 1, date: '2026-06-14', timeUTC: '04:00', venue: 'BC Place', city: 'Vancouver', stage: 'group', status: 'completed', homeScore: 1, awayScore: 0 },
  // MD2
  { id: 79, home: 'USA', away: 'AUS', group: 'D', matchday: 2, date: '2026-06-19', timeUTC: '19:00', venue: 'Lumen Field', city: 'Seattle', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 80, home: 'TUR', away: 'PAR', group: 'D', matchday: 2, date: '2026-06-20', timeUTC: '03:00', venue: "Levi's Stadium", city: 'Santa Clara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 103, home: 'TUR', away: 'USA', group: 'D', matchday: 3, date: '2026-06-25', timeUTC: '02:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 104, home: 'PAR', away: 'AUS', group: 'D', matchday: 3, date: '2026-06-25', timeUTC: '02:00', venue: "Levi's Stadium", city: 'Santa Clara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP E ────────────────────────────────────────────────
  // MD1
  { id: 9, home: 'GER', away: 'CUW', group: 'E', matchday: 1, date: '2026-06-14', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 10, home: 'CIV', away: 'ECU', group: 'E', matchday: 1, date: '2026-06-14', timeUTC: '23:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 81, home: 'GER', away: 'CIV', group: 'E', matchday: 2, date: '2026-06-20', timeUTC: '20:00', venue: 'BMO Field', city: 'Toronto', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 82, home: 'ECU', away: 'CUW', group: 'E', matchday: 2, date: '2026-06-21', timeUTC: '00:00', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 105, home: 'CUW', away: 'CIV', group: 'E', matchday: 3, date: '2026-06-25', timeUTC: '20:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 106, home: 'ECU', away: 'GER', group: 'E', matchday: 3, date: '2026-06-25', timeUTC: '20:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP F ────────────────────────────────────────────────
  // MD1
  { id: 11, home: 'NED', away: 'JPN', group: 'F', matchday: 1, date: '2026-06-14', timeUTC: '20:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 12, home: 'SWE', away: 'TUN', group: 'F', matchday: 1, date: '2026-06-15', timeUTC: '02:00', venue: 'Estadio BBVA', city: 'Monterrey', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 83, home: 'NED', away: 'SWE', group: 'F', matchday: 2, date: '2026-06-20', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 84, home: 'TUN', away: 'JPN', group: 'F', matchday: 2, date: '2026-06-20', timeUTC: '04:00', venue: 'Estadio BBVA', city: 'Monterrey', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 107, home: 'JPN', away: 'SWE', group: 'F', matchday: 3, date: '2026-06-25', timeUTC: '23:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 108, home: 'TUN', away: 'NED', group: 'F', matchday: 3, date: '2026-06-25', timeUTC: '23:00', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP G ────────────────────────────────────────────────
  // MD1
  { id: 13, home: 'BEL', away: 'EGY', group: 'G', matchday: 1, date: '2026-06-15', timeUTC: '19:00', venue: 'Lumen Field', city: 'Seattle', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 14, home: 'IRN', away: 'NZL', group: 'G', matchday: 1, date: '2026-06-16', timeUTC: '01:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 85, home: 'BEL', away: 'IRN', group: 'G', matchday: 2, date: '2026-06-21', timeUTC: '19:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 86, home: 'NZL', away: 'EGY', group: 'G', matchday: 2, date: '2026-06-22', timeUTC: '01:00', venue: 'BC Place', city: 'Vancouver', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 109, home: 'EGY', away: 'IRN', group: 'G', matchday: 3, date: '2026-06-26', timeUTC: '03:00', venue: 'Lumen Field', city: 'Seattle', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 110, home: 'NZL', away: 'BEL', group: 'G', matchday: 3, date: '2026-06-26', timeUTC: '03:00', venue: 'BC Place', city: 'Vancouver', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP H ────────────────────────────────────────────────
  // MD1
  { id: 15, home: 'ESP', away: 'CPV', group: 'H', matchday: 1, date: '2026-06-15', timeUTC: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 16, home: 'KSA', away: 'URU', group: 'H', matchday: 1, date: '2026-06-15', timeUTC: '22:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 87, home: 'ESP', away: 'KSA', group: 'H', matchday: 2, date: '2026-06-21', timeUTC: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 88, home: 'URU', away: 'CPV', group: 'H', matchday: 2, date: '2026-06-21', timeUTC: '22:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 111, home: 'CPV', away: 'KSA', group: 'H', matchday: 3, date: '2026-06-27', timeUTC: '00:00', venue: 'NRG Stadium', city: 'Houston', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 112, home: 'URU', away: 'ESP', group: 'H', matchday: 3, date: '2026-06-27', timeUTC: '00:00', venue: 'Estadio Akron', city: 'Guadalajara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP I ────────────────────────────────────────────────
  // MD1
  { id: 17, home: 'FRA', away: 'SEN', group: 'I', matchday: 1, date: '2026-06-16', timeUTC: '19:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 18, home: 'IRQ', away: 'NOR', group: 'I', matchday: 1, date: '2026-06-16', timeUTC: '22:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 89, home: 'FRA', away: 'IRQ', group: 'I', matchday: 2, date: '2026-06-22', timeUTC: '21:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 90, home: 'NOR', away: 'SEN', group: 'I', matchday: 2, date: '2026-06-23', timeUTC: '00:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 113, home: 'NOR', away: 'FRA', group: 'I', matchday: 3, date: '2026-06-26', timeUTC: '19:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 114, home: 'SEN', away: 'IRQ', group: 'I', matchday: 3, date: '2026-06-26', timeUTC: '19:00', venue: 'BMO Field', city: 'Toronto', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP J ────────────────────────────────────────────────
  // MD1
  { id: 19, home: 'ARG', away: 'ALG', group: 'J', matchday: 1, date: '2026-06-17', timeUTC: '01:00', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 20, home: 'AUT', away: 'JOR', group: 'J', matchday: 1, date: '2026-06-16', timeUTC: '04:00', venue: "Levi's Stadium", city: 'Santa Clara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 91, home: 'ARG', away: 'AUT', group: 'J', matchday: 2, date: '2026-06-22', timeUTC: '17:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 92, home: 'JOR', away: 'ALG', group: 'J', matchday: 2, date: '2026-06-23', timeUTC: '03:00', venue: "Levi's Stadium", city: 'Santa Clara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 115, home: 'JOR', away: 'ARG', group: 'J', matchday: 3, date: '2026-06-27', timeUTC: '02:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 116, home: 'ALG', away: 'AUT', group: 'J', matchday: 3, date: '2026-06-27', timeUTC: '02:00', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP K ────────────────────────────────────────────────
  // MD1
  { id: 21, home: 'POR', away: 'COD', group: 'K', matchday: 1, date: '2026-06-17', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 22, home: 'UZB', away: 'COL', group: 'K', matchday: 1, date: '2026-06-18', timeUTC: '02:00', venue: 'Estadio Azteca', city: 'Mexico City', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 93, home: 'POR', away: 'UZB', group: 'K', matchday: 2, date: '2026-06-23', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 94, home: 'COL', away: 'COD', group: 'K', matchday: 2, date: '2026-06-24', timeUTC: '02:00', venue: 'Estadio Akron', city: 'Guadalajara', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 117, home: 'COL', away: 'POR', group: 'K', matchday: 3, date: '2026-06-27', timeUTC: '23:30', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 118, home: 'COD', away: 'UZB', group: 'K', matchday: 3, date: '2026-06-27', timeUTC: '23:30', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── GROUP L ────────────────────────────────────────────────
  // MD1
  { id: 23, home: 'ENG', away: 'CRO', group: 'L', matchday: 1, date: '2026-06-17', timeUTC: '20:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 24, home: 'GHA', away: 'PAN', group: 'L', matchday: 1, date: '2026-06-17', timeUTC: '23:00', venue: 'BMO Field', city: 'Toronto', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD2
  { id: 95, home: 'ENG', away: 'GHA', group: 'L', matchday: 2, date: '2026-06-23', timeUTC: '20:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 96, home: 'PAN', away: 'CRO', group: 'L', matchday: 2, date: '2026-06-23', timeUTC: '23:00', venue: 'BMO Field', city: 'Toronto', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  // MD3
  { id: 119, home: 'PAN', away: 'ENG', group: 'L', matchday: 3, date: '2026-06-27', timeUTC: '21:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 120, home: 'CRO', away: 'GHA', group: 'L', matchday: 3, date: '2026-06-27', timeUTC: '21:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'group', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── ROUND OF 32 ───────────────────────────────────────────
  { id: 201, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-28', timeUTC: '19:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 202, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-29', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 203, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-29', timeUTC: '20:30', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 204, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-29', timeUTC: '01:00', venue: 'Estadio BBVA', city: 'Monterrey', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 205, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-30', timeUTC: '17:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 206, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-30', timeUTC: '21:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 207, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-06-30', timeUTC: '01:00', venue: 'Estadio Azteca', city: 'Mexico City', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 208, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-01', timeUTC: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 209, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-01', timeUTC: '20:00', venue: 'Lumen Field', city: 'Seattle', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 210, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-02', timeUTC: '00:00', venue: "Levi's Stadium", city: 'Santa Clara', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 211, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-02', timeUTC: '19:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 212, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-02', timeUTC: '23:00', venue: 'BMO Field', city: 'Toronto', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 213, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-03', timeUTC: '03:00', venue: 'BC Place', city: 'Vancouver', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 214, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-03', timeUTC: '18:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 215, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-03', timeUTC: '22:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 216, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-04', timeUTC: '01:30', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'r32', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── ROUND OF 16 ───────────────────────────────────────────
  { id: 301, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-05', timeUTC: '17:00', venue: 'NRG Stadium', city: 'Houston', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 302, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-05', timeUTC: '21:00', venue: 'Lincoln Financial Field', city: 'Philadelphia', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 303, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-06', timeUTC: '20:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 304, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-07', timeUTC: '00:00', venue: 'Estadio Azteca', city: 'Mexico City', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 305, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-07', timeUTC: '19:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 306, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-08', timeUTC: '00:00', venue: 'Lumen Field', city: 'Seattle', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 307, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-08', timeUTC: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 308, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-08', timeUTC: '20:00', venue: 'BC Place', city: 'Vancouver', stage: 'r16', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── QUARTER-FINALS ────────────────────────────────────────
  { id: 401, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-10', timeUTC: '20:00', venue: 'Gillette Stadium', city: 'Foxborough', stage: 'qf', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 402, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-11', timeUTC: '19:00', venue: 'SoFi Stadium', city: 'Inglewood', stage: 'qf', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 403, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-12', timeUTC: '21:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'qf', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 404, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-13', timeUTC: '01:00', venue: 'GEHA Field at Arrowhead', city: 'Kansas City', stage: 'qf', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── SEMI-FINALS ──────────────────────────────────────────
  { id: 501, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-14', timeUTC: '19:00', venue: 'AT&T Stadium', city: 'Arlington', stage: 'sf', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 502, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-15', timeUTC: '19:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', stage: 'sf', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── THIRD PLACE ──────────────────────────────────────────
  { id: 601, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-18', timeUTC: '21:00', venue: 'Hard Rock Stadium', city: 'Miami', stage: 'third', status: 'scheduled', homeScore: null, awayScore: null },

  // ─── FINAL ────────────────────────────────────────────────
  { id: 701, home: 'TBD', away: 'TBD', group: '', matchday: 0, date: '2026-07-19', timeUTC: '19:00', venue: 'MetLife Stadium', city: 'East Rutherford', stage: 'final', status: 'scheduled', homeScore: null, awayScore: null },
];

export const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Final',
  sf: 'Semi-Final',
  third: 'Third Place',
  final: 'Final',
};
