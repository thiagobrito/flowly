/**
 * # Coach mobile
 *
 * Sugestões acionáveis de agenda alinhadas à energia do dia.
 * Lógica pura (testável) + UI consome sugestões do servidor.
 */

export { type AiCoachSuggestionsResult, type AiSuggestionsContext, mapServerSuggestions, sendCoachSuggestionFeedback, useAiCoachSuggestions } from './aiSuggestions';
export { buildMobileDayCurve, type DayEnergyCurve, type EnergyHour } from './dayCurve';
export { loadDismissedForToday, saveDismissedForToday } from './dismissed';
export { buildCandidates, buildRecommendations, energyValleyRecommendations, LOW_SLEEP_HOURS, MAX_RECOMMENDATIONS, quantizeNow, sleepDebtDeferRecommendations, unscheduledImpactRecommendations } from './rules';
export { blockDurationMinutes, blockForDay, busyIntervals, findBestSlot, formatHourLabel, isoAtDayMinutes, minutesOfIso, SLOT_MINUTES } from './schedule';
export type { CoachAction, CoachInput, CoachInsight } from './types';
