/**
 * # Energy Mode
 *
 * Override manual do nível de energia do dia (Ideal / Low / Rushed).
 * O motor continua calculando normalmente; o modo só altera o valor efetivo
 * usado na priorização e, em Rushed, filtra a lista.
 */

export { applyEnergyMode, type EffectiveEnergy, type EngineEnergy, filterTasksForMode, scoreToApiLevel } from './apply';
export { loadEnergyModeForToday, saveEnergyModeForToday } from './storage';
export { ENERGY_MODE_OPTIONS, type EnergyMode, type EnergyModeState, MODE_DECLARED_SCORE, RUSHED_MAX_MINUTES, RUSHED_MIN_IMPACT } from './types';
