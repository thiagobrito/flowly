import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

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

  it('marca a janela de pico sobre a curva, não só no texto de apoio', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.getByText(/^\d{1,2}h às \d{1,2}h$/)).toBeTruthy();
  });

  // Sem eixo, a curva vira enfeite: o usuário precisa saber a que horas atacar.
  it('rotula o eixo de horas com o começo e o fim do dia acordado', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.getAllByText(/^\d{1,2}h$/).length).toBeGreaterThanOrEqual(5);
  });

  it('nomeia a faixa de cada período além do número', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.getAllByText(/^(Alta|Média|Baixa)$/)).toHaveLength(3);
  });

  it('não mostra o botão de minimizar fora da lista de tarefas', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    expect(screen.queryByLabelText('Minimizar pico de energia')).toBeNull();
  });

  it('esconde o gráfico e volta a mostrá-lo', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} collapsible />);

    expect(screen.getByText('Manhã')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Minimizar pico de energia'));

    expect(screen.queryByText('Manhã')).toBeNull();
    expect(screen.queryByLabelText(/Curva de energia do dia/)).toBeNull();
    expect(screen.getByText('Pico de energia de hoje')).toBeTruthy();
    expect(screen.getByText(/^\d{1,2}h às \d{1,2}h$/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Mostrar pico de energia/));

    expect(screen.getByText('Manhã')).toBeTruthy();
    expect(screen.getByLabelText(/Curva de energia do dia/)).toBeTruthy();
  });

  it('lembra que o gráfico foi minimizado', async () => {
    const { unmount } = render(<PeakEnergyCard input={input} currentScore={70} isDark={false} collapsible />);

    fireEvent.press(screen.getByLabelText('Minimizar pico de energia'));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('peak_energy_card_collapsed_v1')).toBe('1');
    });

    unmount();
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} collapsible />);

    await waitFor(() => {
      expect(screen.queryByText('Manhã')).toBeNull();
    });
    expect(screen.getByLabelText(/Mostrar pico de energia/)).toBeTruthy();
  });

  it('descreve o score para leitores de tela, com a faixa de energia', () => {
    render(<PeakEnergyCard input={input} currentScore={70} isDark={false} />);

    // Um rótulo para o número e um para cada bloco de período.
    expect(screen.getAllByLabelText(/de 100, energia (alta|média|baixa)/)).toHaveLength(4);
  });
});
