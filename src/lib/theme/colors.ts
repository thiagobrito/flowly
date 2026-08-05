/**
 * # Paleta do app
 *
 * Fonte única das cores que carregam significado (energia alta/média/baixa,
 * acento de ação). Estavam duplicadas como literais em `heatColor`,
 * `Goals/data.ts`, `CalendarHourLabel` e `Calendar/theme.ts` — quatro lugares
 * onde "verde" tinha o mesmo valor por coincidência, não por contrato.
 *
 * ## Contraste
 *
 * Os fundos de energia são deliberadamente translúcidos e claros: o texto que
 * fica sobre eles é `zinc-800` (claro) / `zinc-100` (escuro), e opacidades
 * acima das definidas aqui derrubam o contraste abaixo de 4.5:1. Ao mexer
 * nesses valores, verifique o par fundo/texto — não só o fundo.
 */

/** Acento de ação e de identidade do produto (indigo). */
export const ACCENT = '#6366f1';
export const ACCENT_LIGHT = '#818cf8';

/** Acento de "agora"/hoje no calendário (azul). */
export const ACCENT_TIME = '#3b82f6';

/** Faixas de energia, do topo para o fundo. */
export const ENERGY = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
} as const;

export type EnergyBandKey = keyof typeof ENERGY;

/** Score mínimo de cada faixa. */
export const ENERGY_THRESHOLDS = {
  high: 70,
  medium: 40,
} as const;

/** Faixa de energia de um score 0–100. */
export function energyBandKey(score: number): EnergyBandKey {
  if (score >= ENERGY_THRESHOLDS.high) return 'high';
  if (score >= ENERGY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/** Rótulo em pt-BR de cada faixa, para uso em texto e em `accessibilityLabel`. */
export const ENERGY_BAND_LABEL: Record<EnergyBandKey, string> = {
  high: 'energia alta',
  medium: 'energia média',
  low: 'energia baixa',
};

const RGB: Record<EnergyBandKey, string> = {
  high: '34,197,94',
  medium: '234,179,8',
  low: '239,68,68',
};

/**
 * Fundo translúcido de uma faixa de energia.
 *
 * As opacidades são o teto que mantém `zinc-800` / `zinc-100` em contraste AA
 * sobre as superfícies do app.
 */
export function energySurface(band: EnergyBandKey, isDark: boolean): string {
  return `rgba(${RGB[band]},${isDark ? 0.22 : 0.14})`;
}

/** Borda de uma faixa de energia, um passo mais opaca que a superfície. */
export function energyBorder(band: EnergyBandKey, isDark: boolean): string {
  return `rgba(${RGB[band]},${isDark ? 0.4 : 0.3})`;
}

/** Superfície e borda neutras dos cartões. */
export const surface = {
  card: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
  border: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'),
  subtle: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
} as const;

/** Texto secundário. */
export const mutedText = (isDark: boolean) => (isDark ? '#a1a1aa' : '#71717a');
