import { clamp } from './normalize';

/**
 * Task Compatibility — how well a task's energy requirement matches the
 * user's current biological capacity.
 */

/** Converts the 0-100 energy score to the 0-5 scale used by the task engine. */
export const energyScoreToLevel = (energyScore: number): number => clamp(energyScore) / 20;

/**
 * Compatibility between the user's current energy and a task's requirement,
 * both on the 0-5 scale:
 *
 *   compatibility = 1 - |currentEnergy - taskEnergy| / 5
 *
 * Returns 1 for a perfect match and 0 for the maximum possible mismatch.
 */
export const computeTaskCompatibility = (currentEnergy: number, taskEnergy: number): number => {
  const current = clamp(currentEnergy, 0, 5);
  const task = clamp(taskEnergy, 0, 5);
  return clamp(1 - Math.abs(current - task) / 5, 0, 1);
};
