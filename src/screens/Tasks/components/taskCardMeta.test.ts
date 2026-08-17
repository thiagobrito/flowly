import type { Task } from '../../NewTask/data';
import { energyChipLabel, startTimeLabel, taskEnergyBand } from './taskCardMeta';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  randomId: 'random-1',
  name: 'Escrever proposta comercial',
  goal: { id: 'goal-1', name: 'work' },
  area: 'work',
  energy: 5,
  impact: 4,
  frequency: { kind: 'daily', everyDay: true, days: [] },
  ...overrides,
});

describe('taskEnergyBand', () => {
  // Os cortes têm que ser os mesmos do score do dia: se 4/5 na tarefa não
  // significar a mesma "alta" da curva, o pareamento entre as duas é chute.
  it('usa os mesmos cortes que o score 0–100', () => {
    expect(taskEnergyBand(5)).toBe('high');
    expect(taskEnergyBand(3.5)).toBe('high');
    expect(taskEnergyBand(3)).toBe('medium');
    expect(taskEnergyBand(2)).toBe('medium');
    expect(taskEnergyBand(1)).toBe('low');
    expect(taskEnergyBand(0)).toBe('low');
  });
});

describe('energyChipLabel', () => {
  it('escreve a faixa por extenso, com a inicial maiúscula', () => {
    expect(energyChipLabel(5)).toBe('Energia alta');
    expect(energyChipLabel(3)).toBe('Energia média');
    expect(energyChipLabel(1)).toBe('Energia baixa');
  });
});

describe('startTimeLabel', () => {
  it('formata o horário do bloco agendado para o dia', () => {
    const scheduled = new Date(2026, 7, 16, 9, 5);

    expect(startTimeLabel(task({ schedule: [{ dateTime: scheduled.toISOString(), duration: 90 }] }), '2026-08-16')).toBe('09:05');
  });

  it('ignora blocos de outros dias', () => {
    const scheduled = new Date(2026, 7, 15, 9, 5);

    expect(startTimeLabel(task({ schedule: [{ dateTime: scheduled.toISOString(), duration: 90 }] }), '2026-08-16')).toBeNull();
  });

  it('devolve null quando a tarefa não tem hora marcada', () => {
    expect(startTimeLabel(task(), '2026-08-16')).toBeNull();
  });
});
