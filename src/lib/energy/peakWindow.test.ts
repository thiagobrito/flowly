import { findPeakWindow, formatPeakWindowLabel, periodHeatmap } from './peakWindow';
import type { EnergyCurvePoint } from './types';

function curveFromScores(scores: number[], wakeHour = 7): EnergyCurvePoint[] {
  return scores.map((energyScore, index) => {
    const hour = wakeHour + index * 0.5;
    const h = Math.floor(hour);
    const m = (hour % 1) * 60;
    return {
      time: `2026-08-04T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000-03:00`,
      hoursAwake: index * 0.5,
      energyScore,
    };
  });
}

describe('findPeakWindow', () => {
  it('escolhe o bloco de 3h com maior soma', () => {
    // 0.5h steps → 6 pontos = 3h. Pico artificial entre índices 4–9.
    const scores = [20, 25, 30, 40, 80, 85, 90, 88, 82, 70, 50, 40, 30];
    const window = findPeakWindow(curveFromScores(scores));
    expect(window).not.toBeNull();
    expect(window!.startIndex).toBe(4);
    expect(window!.peakScore).toBe(90);
  });

  it('formata o rótulo em português', () => {
    const window = findPeakWindow(curveFromScores([50, 60, 70, 80, 90, 85, 70]));
    expect(formatPeakWindowLabel(window)).toMatch(/das \d{2}h às \d{2}h/);
  });
});

describe('periodHeatmap', () => {
  it('agrega manhã/tarde/noite', () => {
    const heat = periodHeatmap(curveFromScores([80, 80, 60, 60, 40, 40], 8));
    expect(heat).toHaveLength(3);
    expect(heat[0]!.key).toBe('morning');
  });
});
