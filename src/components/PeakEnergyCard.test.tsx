import { render, screen } from '@testing-library/react-native';

import type { FlowlyEngineInput } from '@/lib/energy';

import PeakEnergyCard from './PeakEnergyCard';

const input: FlowlyEngineInput = {
  sleepNeedHours: 8,
  sleepHistory: [
    { date: '2026-08-03', sleepHours: 8 },
    { date: '2026-08-04', sleepHours: 8 },
  ],
  lastNightSleepHours: 8,
  wakeTime: '2026-08-04T10:00:00.000Z',
  bedTime: '2026-08-04T02:00:00.000Z',
  hrvMs: 70,
  restingHeartRate: 55,
};

describe('PeakEnergyCard', () => {
  it('mostra o título em pt-BR', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.getByText('Pico de energia de hoje')).toBeTruthy();
  });

  // O app não tem i18n: uma string em inglês aqui é uma string em inglês para
  // todo mundo. Este teste é a guarda contra o "Peak Energy Score" voltar.
  it('não contém texto em inglês', () => {
    const { toJSON } = render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(JSON.stringify(toJSON())).not.toMatch(/Peak Energy|Score|Share/);
  });

  it('mostra os três períodos do dia', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.getByText('Manhã')).toBeTruthy();
    expect(screen.getByText('Tarde')).toBeTruthy();
    expect(screen.getByText('Noite')).toBeTruthy();
  });

  it('não oferece compartilhamento: o share por imagem mora na revisão semanal', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.queryByLabelText(/compartilhar/i)).toBeNull();
  });

  it('sem input, pede o horário de sono em vez de mostrar um número vazio', () => {
    render(<PeakEnergyCard input={null} currentScore={0} isDark={false} />);

    expect(screen.getByText(/Informe seu horário de sono/)).toBeTruthy();
    expect(screen.queryByText('Manhã')).toBeNull();
  });

  it('aceita título e subtítulo próprios (onboarding)', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} title="Sua curva de energia" subtitle="Texto do onboarding" />);

    expect(screen.getByText('Sua curva de energia')).toBeTruthy();
    expect(screen.getByText('Texto do onboarding')).toBeTruthy();
  });

  it('descreve o score para leitores de tela, com a faixa de energia', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    // Um rótulo para o número e um para cada bloco de período.
    expect(screen.getAllByLabelText(/de 100, energia (alta|média|baixa)/)).toHaveLength(4);
  });
});
