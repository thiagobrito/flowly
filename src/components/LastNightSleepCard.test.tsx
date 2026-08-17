import { render, screen } from '@testing-library/react-native';

import type { FlowlyEngineInput } from '@/lib/energy';

import LastNightSleepCard, { summarizeNight } from './LastNightSleepCard';

const night = (overrides: Partial<FlowlyEngineInput> = {}): FlowlyEngineInput => ({
  sleepNeedHours: 8,
  sleepHistory: [],
  lastNightSleepHours: 7.9,
  bedTime: new Date(2026, 7, 15, 23, 15).toISOString(),
  wakeTime: new Date(2026, 7, 16, 7, 10).toISOString(),
  hrvMs: 70,
  restingHeartRate: 55,
  ...overrides,
});

describe('summarizeNight', () => {
  it('formata deitar, acordar e total dormido', () => {
    expect(summarizeNight(night())).toEqual({ bed: '23h15', wake: '7h10', total: '7h54' });
  });

  // Sem a hora de deitar o card não responde a pergunta que ele existe para
  // responder: some inteiro em vez de mostrar meia informação.
  it('não resume uma noite pela metade', () => {
    expect(summarizeNight(night({ bedTime: undefined }))).toBeNull();
    expect(summarizeNight(night({ wakeTime: undefined }))).toBeNull();
    expect(summarizeNight(null)).toBeNull();
  });

  it('cai para o intervalo entre os horários quando a duração não veio', () => {
    expect(summarizeNight(night({ lastNightSleepHours: undefined }))?.total).toBe('7h55');
  });
});

describe('LastNightSleepCard', () => {
  it('mostra a noite em uma linha', () => {
    render(<LastNightSleepCard input={night()} isDark={false} />);

    expect(screen.getByText('23h15 → 7h10')).toBeTruthy();
    expect(screen.getByText('7h54')).toBeTruthy();
  });

  it('não renderiza nada sem perfil de sono', () => {
    const { toJSON } = render(<LastNightSleepCard input={null} isDark={false} />);

    expect(toJSON()).toBeNull();
  });
});
