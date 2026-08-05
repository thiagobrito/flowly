import { computeEnergyAtMoment } from '@/lib/energy/engine/flowlyEngine';
import type { FlowlyEngineInput, SleepNight } from '@/lib/energy/types';

import { applyEnergyMode, filterTasksForMode, scoreToApiLevel } from './apply';
import { RUSHED_MAX_MINUTES } from './types';

const WAKE = '2026-06-08T07:00:00.000Z';
const BED = '2026-06-07T23:00:00.000Z';

const atHoursAwake = (hours: number): string => new Date(new Date(WAKE).getTime() + hours * 3600_000).toISOString();

const nights = (hours: number[]): SleepNight[] => hours.map((sleepHours, i) => ({ date: `2026-05-${String(25 + i).padStart(2, '0')}`, sleepHours }));

const engineInput = (sleepHours: number): FlowlyEngineInput => ({
  sleepNeedHours: 8,
  sleepHistory: nights([sleepHours, sleepHours, sleepHours, sleepHours, sleepHours, sleepHours, sleepHours]),
  lastNightSleepHours: sleepHours,
  wakeTime: WAKE,
  bedTime: BED,
  hrvMs: sleepHours >= 8 ? 80 : 25,
  restingHeartRate: sleepHours >= 8 ? 50 : 80,
});

describe('scoreToApiLevel', () => {
  it('mapeia o score declarado 0–100 na escala 0–5 do motor', () => {
    expect(scoreToApiLevel(0)).toBe(0);
    expect(scoreToApiLevel(100)).toBe(5);
    expect(scoreToApiLevel(50)).toBeCloseTo(2.5, 5);
    expect(scoreToApiLevel(30)).toBeCloseTo(1.5, 5);
  });
});

describe('applyEnergyMode', () => {
  // Regressão: o modo ideal não pode alterar o nível que o motor publicou. Se
  // este nível for recalculado a partir do `doubleEnergyScore` (que sofre clamp
  // em 100), a escala se deforma, o backend reprioriza a lista inteira do dia
  // pelo FlowScore e todas as chaves de cache de tarefas mudam.
  it('repassa intacto o doubleEnergyLevel do motor no modo ideal', () => {
    for (const sleepHours of [8, 5]) {
      for (let t = 0; t <= 16; t += 0.5) {
        const result = computeEnergyAtMoment(engineInput(sleepHours), atHoursAwake(t));
        const effective = applyEnergyMode('ideal', { score: result.doubleEnergyScore, level: result.doubleEnergyLevel });

        expect(effective.level).toBe(result.doubleEnergyLevel);
        expect(effective.score).toBe(result.doubleEnergyScore);
      }
    }
  });

  it('repassa intacto o par do motor no modo rushed (filtro é separado)', () => {
    const result = applyEnergyMode('rushed', { score: 55, level: 5.5 });
    expect(result.score).toBe(55);
    expect(result.level).toBe(5.5);
    expect(result.declaredScore).toBeNull();
  });

  it('força ~30 no modo low, ignorando o motor', () => {
    const result = applyEnergyMode('low', { score: 80, level: 8 });
    expect(result.score).toBe(30);
    expect(result.declaredScore).toBe(30);
    expect(result.level).toBeCloseTo(1.5, 5);
  });
});

describe('filterTasksForMode', () => {
  const tasks = [
    { id: 'a', impact: 5, estimatedMinutes: 20 },
    { id: 'b', impact: 5, estimatedMinutes: 90 },
    { id: 'c', impact: 2, estimatedMinutes: 10 },
    { id: 'd', impact: 4, estimatedMinutes: null },
  ];

  it('não filtra nos modos ideal e low', () => {
    expect(filterTasksForMode(tasks, 'ideal')).toHaveLength(4);
    expect(filterTasksForMode(tasks, 'low')).toHaveLength(4);
  });

  it('em rushed mantém alto impacto e duração curta ou sem estimativa', () => {
    const filtered = filterTasksForMode(tasks, 'rushed');
    expect(filtered.map((task) => task.id)).toEqual(['a', 'd']);
  });

  it('em rushed descarta tarefas sem impacto informado', () => {
    const filtered = filterTasksForMode([{ id: 'x' }, { id: 'y', impact: null }], 'rushed');
    expect(filtered).toEqual([]);
  });

  it('em rushed trata duração zero como sem estimativa', () => {
    const filtered = filterTasksForMode([{ id: 'z', impact: 5, estimatedMinutes: 0 }], 'rushed');
    expect(filtered.map((task) => task.id)).toEqual(['z']);
  });

  it('em rushed mantém exatamente o limite de duração', () => {
    const filtered = filterTasksForMode(
      [
        { id: 'no-limite', impact: 5, estimatedMinutes: RUSHED_MAX_MINUTES },
        { id: 'acima', impact: 5, estimatedMinutes: RUSHED_MAX_MINUTES + 1 },
      ],
      'rushed',
    );
    expect(filtered.map((task) => task.id)).toEqual(['no-limite']);
  });
});
