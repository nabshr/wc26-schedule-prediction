import { GROUP_NAMES, getTeamsByGroup } from '../data/worldCup2026';
import { DEFAULT_SIMULATION_RUNS, SIMULATION_SEED } from './simulationConfig';
import { SimulationResult, GroupProbabilities, KnockoutSimResult } from './types';

// ... (keep existing code until simulateGroupStage)

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