/**
 * Detecção da janela de pico de energia — port do dashboard web
 * (`web/src/lib/energy/dayCurve.ts`) para o mobile.
 */

import type { EnergyCurvePoint } from './types';

/** Tamanho da janela de pico destacada na UI (horas). */
export const PEAK_WINDOW_HOURS = 3;

export type PeakWindow = {
  /** Índice do primeiro ponto da janela na curva. */
  startIndex: number;
  /** Índice exclusivo do fim da janela. */
  endIndex: number;
  startISO: string;
  endISO: string;
  /** Score médio 0–100 na janela. */
  avgScore: number;
  /** Melhor score pontual na curva. */
  peakScore: number;
};

function hourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--h';
  return `${String(date.getHours()).padStart(2, '0')}h`;
}

/** Formata "das 10h às 13h" a partir da janela. */
export function formatPeakWindowLabel(window: PeakWindow | null): string {
  if (!window) return 'seu pico ainda está sendo calculado';
  return `das ${hourLabel(window.startISO)} às ${hourLabel(window.endISO)}`;
}

/**
 * Melhor bloco contíguo de `windowHours` na curva (pela soma dos scores).
 * Assume amostragem uniforme (ex.: 30 min).
 */
export function findPeakWindow(curve: EnergyCurvePoint[], windowHours = PEAK_WINDOW_HOURS): PeakWindow | null {
  if (curve.length === 0) return null;

  const stepHours = curve.length >= 2 ? Math.max(curve[1]!.hoursAwake - curve[0]!.hoursAwake, 0.25) : 0.5;
  const windowPoints = Math.max(1, Math.round(windowHours / stepHours));

  if (curve.length < windowPoints) {
    const peakScore = Math.max(...curve.map((point) => point.energyScore));
    const first = curve[0]!;
    const last = curve[curve.length - 1]!;
    return {
      startIndex: 0,
      endIndex: curve.length,
      startISO: first.time,
      endISO: last.time,
      avgScore: curve.reduce((sum, point) => sum + point.energyScore, 0) / curve.length,
      peakScore,
    };
  }

  let best: { startIndex: number; total: number } | null = null;

  for (let start = 0; start + windowPoints <= curve.length; start += 1) {
    let total = 0;
    for (let i = start; i < start + windowPoints; i += 1) {
      total += curve[i]!.energyScore;
    }
    if (!best || total > best.total) {
      best = { startIndex: start, total };
    }
  }

  if (!best) return null;

  const slice = curve.slice(best.startIndex, best.startIndex + windowPoints);
  const peakScore = Math.max(...curve.map((point) => point.energyScore));

  return {
    startIndex: best.startIndex,
    endIndex: best.startIndex + windowPoints,
    startISO: slice[0]!.time,
    endISO: slice[slice.length - 1]!.time,
    avgScore: best.total / windowPoints,
    peakScore,
  };
}

export type DayPeriodHeat = {
  key: 'morning' | 'afternoon' | 'evening';
  label: string;
  /** Score médio 0–100. */
  avgScore: number;
};

/** Heatmap simples manhã / tarde / noite a partir da curva. */
export function periodHeatmap(curve: EnergyCurvePoint[]): DayPeriodHeat[] {
  const buckets: Record<DayPeriodHeat['key'], number[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const point of curve) {
    const hour = new Date(point.time).getHours();
    if (!Number.isNaN(hour)) {
      if (hour < 12) buckets.morning.push(point.energyScore);
      else if (hour < 18) buckets.afternoon.push(point.energyScore);
      else buckets.evening.push(point.energyScore);
    }
  }

  const avg = (values: number[]) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);

  return [
    { key: 'morning', label: 'Manhã', avgScore: avg(buckets.morning) },
    { key: 'afternoon', label: 'Tarde', avgScore: avg(buckets.afternoon) },
    { key: 'evening', label: 'Noite', avgScore: avg(buckets.evening) },
  ];
}
