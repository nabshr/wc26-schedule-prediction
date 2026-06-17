import { GROUP_NAMES, getTeamsByGroup } from '../data/worldCup2026';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED } from './simulationConfig';
import { SimulationResult, GroupProbabilities, KnockoutSimResult } from './types';

// Types
export type MatchPrediction = {
  homeWin: number;
  draw: number;
  awayWin: number;
};

export type ScorelineProb = {
  homeScore: number;
  awayScore: number;
  probability: number;
};

export type VenueContext = {
  venue: string;
  city: string;
  country: string;
  capacity: number;
  climate: 'hot' | 'temperate' | 'cold';
};

// Function to predict match outcome using Elo ratings
export function predictMatch(homeTeamCode: string, awayTeamCode: string, homeElo: number, awayElo: number): MatchPrediction {
  // Calculate expected score using Elo formula
  const expectedHomeScore = 1 / (1 + Math.pow(10, (awayElo - homeElo) / 400));
  const expectedAwayScore = 1 / (1 + Math.pow(10, (homeElo - awayElo) / 400));

  // Convert expected scores to win probabilities
  // Using a simplified model where draw probability is based on the difference in strength
  const drawProbability = 1 - Math.abs(expectedHomeScore - expectedAwayScore) * 0.5;
  const homeWinProbability = expectedHomeScore * (1 - drawProbability / 2);
  const awayWinProbability = expectedAwayScore * (1 - drawProbability / 2);

  // Normalize probabilities to sum to 1
  const total = homeWinProbability + drawProbability + awayWinProbability;
  return {
    homeWin: homeWinProbability / total,
    draw: drawProbability / total,
    awayWin: awayWinProbability / total
  };
}

// Function to build a matrix of possible scorelines and their probabilities
export function buildScorelineMatrix(homeTeamCode: string, awayTeamCode: string, homeElo: number, awayElo: number): ScorelineProb[] {
  const prediction = predictMatch(homeTeamCode, awayTeamCode, homeElo, awayElo);
  const scorelines: ScorelineProb[] = [];

  // Generate scorelines from 0-0 to 5-5 (reasonable range for soccer)
  for (let homeScore = 0; homeScore <= 5; homeScore++) {
    for (let awayScore = 0; awayScore <= 5; awayScore++) {
      // Calculate probability based on prediction and Poisson distribution
      // This is a simplified model
      const goalDifference = homeScore - awayScore;
      const expectedGoals = (homeElo + awayElo) / 2 / 1000; // Normalize Elo to expected goals

      // Adjust probability based on win/draw/loss prediction
      let probability = 1;

      if (goalDifference > 0) {
        // Home win
        probability *= prediction.homeWin;
      } else if (goalDifference < 0) {
        // Away win
        probability *= prediction.awayWin;
      } else {
        // Draw
        probability *= prediction.draw;
      }

      // Apply Poisson distribution for specific scoreline
      // This is a simplified version
      const homeGoalFactor = Math.pow(expectedGoals, homeScore) * Math.exp(-expectedGoals) / factorial(homeScore);
      const awayGoalFactor = Math.pow(expectedGoals, awayScore) * Math.exp(-expectedGoals) / factorial(awayScore);

      probability *= homeGoalFactor * awayGoalFactor;

      // Normalize by total probability
      scorelines.push({
        homeScore,
        awayScore,
        probability
      });
    }
  }

  // Normalize probabilities to sum to 1
  const totalProbability = scorelines.reduce((sum, scoreline) => sum + scoreline.probability, 0);
  return scorelines.map(scoreline => ({
    ...scoreline,
    probability: scoreline.probability / totalProbability
  }));
}

// Helper function for factorial calculation
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

export function populateBracketsFromGroups(sim: SimulationResult): [string, string][] {
  // Extract group results and sort by advancement probability
  return GROUP_NAMES.map(group => {
    const teams = sim.groups[group].sort((a, b) => b.p1st - a.p1st);
    // Return 1st and 2nd place teams as matchup
    return [teams[0].team.code, teams[1].team.code];
  }).flat();
}

export function simulateGroupStage(
  runCount: number = DEFAULT_SIMULATION_RUNS,
  seed: number = SIMULATION_SEED,
  customMatchups?: [string, string][] // New optional parameter
): SimulationResult {
  const rng = mulberry32(seed);

  // ... (keep existing simulation logic until R32)

  // **Updated R32 Population**
  if (customMatchups) {
    R32_MATCHUPS = customMatchups;
  } else {
    // Generate bracket from simulation data
    const groupResults = GROUP_NAMES.map(group => {
      const teams = sim.groups[group].sort((a, b) => b.p1st - a.p1st);
      return [teams[0].team.code, teams[1].team.code]; // 1st and 2nd place
    });

    // Map to official bracket structure
    R32_MATCHUPS = groupResults.flatMap(([first, second], i) => [
      [`1${GROUP_NAMES[i]}`, `P${i}`], // 1st vs 3rd place slot
      [`2${GROUP_NAMES[i]}`, `2${GROUP_NAMES[i]}`] // 2nd vs 2nd place
    ]);
  }

  // ... (rest of simulation remains unchanged)

  return {
    groups: sim.groups,
    groupStrengthRank: sim.groupStrengthRank,
    knockout: {
      ...sim.knockout,
      // Update projected R32 with real data
      projectedR32: customMatchups || populateBracketsFromGroups(sim)
    },
    simulationRuns: runCount,
    modelVersion: MODEL_VERSION
  };
}

// ... (rest of file remains unchanged)

// Helper function for random number generation (mulberry32)
function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Constants for simulation
const R32_MATCHUPS: [string, string][] = [];
const MODEL_VERSION = 'v1.2';

// Export the types needed for the types file
export { MatchPrediction, ScorelineProb, VenueContext };