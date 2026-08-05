/**
 * Curva de energia do dia para o coach mobile — equivalente enxuto de
 * `web/src/lib/energy/dayCurve.ts`, ancorada no FlowlyEngineInput.
 */

import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { anchorInputToDay, computeEnergyAtMoment, findPeakWindow, type FlowlyEngineInput, generateEnergyCurve, type PeakWindow } from '@/lib/energy';

export type EnergyHour = {
  hour: number;
  iso: string;
  /** Score 0–100 (doubleEnergyScore). */
  score: number;
  asleep: boolean;
};

export type DayEnergyCurve = {
  dateKey: string;
  hasProfile: boolean;
  hours: EnergyHour[];
  peakWindow: { startHour: number; endHour: number } | null;
  peak: PeakWindow | null;
};

const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

/**
 * Se o usuário está dormindo naquele instante do dia.
 *
 * A comparação é por horário de relógio, não por instante absoluto: o `bedTime`
 * do input é o da noite **anterior** ao dia analisado (ver `anchorInputToDay`),
 * então comparar timestamps deixava as horas da noite do próprio dia marcadas
 * como acordadas — e o planner oferecia deep work às 23h para quem dorme às 23h.
 */
function isAsleep(input: FlowlyEngineInput, moment: Date): boolean {
  if (!input.wakeTime || !input.bedTime) return false;

  const wake = minutesOfDay(new Date(input.wakeTime));
  const bed = minutesOfDay(new Date(input.bedTime));
  if (bed === wake) return false;

  const at = minutesOfDay(moment);
  // Deitar depois de acordar é o caso normal: a janela atravessa a meia-noite.
  if (bed > wake) return at >= bed || at < wake;
  return at >= bed && at < wake;
}

/** Constrói a curva hora a hora para o dia civil de `dateKey`. */
export function buildMobileDayCurve(input: FlowlyEngineInput | null, dateKey = localDateKey()): DayEnergyCurve {
  if (!input) {
    return { dateKey, hasProfile: false, hours: [], peakWindow: null, peak: null };
  }

  const day = startOfLocalDay(dateKey);
  const dayInput = anchorInputToDay(input, day);
  const hasProfile = Boolean(dayInput.wakeTime && dayInput.bedTime);

  const hours: EnergyHour[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const moment = new Date(day.getTime() + hour * 3600_000);
    const iso = toLocalISOString(moment);
    const score = computeEnergyAtMoment(dayInput, iso).doubleEnergyScore;
    hours.push({ hour, iso, score, asleep: isAsleep(dayInput, moment) });
  }

  const fineCurve = generateEnergyCurve(dayInput, undefined, { stepMinutes: 30 });
  const peak = findPeakWindow(fineCurve);
  const peakWindow = peak
    ? {
        startHour: new Date(peak.startISO).getHours(),
        endHour: new Date(peak.endISO).getHours() || 24,
      }
    : null;

  return { dateKey, hasProfile, hours, peakWindow, peak };
}
