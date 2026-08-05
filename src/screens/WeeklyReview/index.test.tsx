/**
 * Teste que teria pego o bug de safe area.
 *
 * A Revisão Semanal abria com o header (título + X) inteiramente sob a Dynamic
 * Island: invisível e sem área de toque. Como `presentationStyle="fullScreen"`
 * desabilita o swipe-to-dismiss e o app não tem `BackHandler`, o X era a única
 * saída — e a tela ficava sem saída nenhuma.
 *
 * O assert que importa é o último: o botão de fechar existe e chama `onClose`.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { shareViewAsImage } from '@/lib/share';
import { track } from '@/lib/telemetry';

import WeeklyReview from './index';

jest.mock('@/lib/network', () => ({
  api: { get: jest.fn().mockResolvedValue({ completedCount: 0, totalTasks: 0, percent: 0, stats: [] }) },
}));

jest.mock('@/lib/sleepProfile', () => ({
  ...jest.requireActual('@/lib/sleepProfile/apply'),
  useSleepProfile: () => ({ profile: null }),
}));

jest.mock('@/lib/energy', () => ({
  ...jest.requireActual('@/lib/energy/engine'),
  ...jest.requireActual('@/lib/energy/peakWindow'),
  getHealthProvider: () => ({ collect: async () => ({}) }),
}));

jest.mock('@/lib/share', () => ({
  shareViewAsImage: jest.fn().mockResolvedValue('shared'),
}));

jest.mock('@/lib/telemetry', () => ({
  track: jest.fn(),
}));

// O barrel de `weeklyReview` também exporta o agendamento do push, que arrasta
// `expo-constants` para dentro do teste. A tela só usa a parte de energia.
jest.mock('@/lib/weeklyReview', () => jest.requireActual('@/lib/weeklyReview/energy'));

let client: QueryClient;

function renderReview({ visible = true, onClose = jest.fn() } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  render(
    <QueryClientProvider client={client}>
      <WeeklyReview visible={visible} onClose={onClose} />
    </QueryClientProvider>,
  );

  return { onClose };
}

describe('WeeklyReview', () => {
  // Sem isso as queries continuam notificando depois do teste, o que vira warning
  // de `act(...)` e handle aberto no fim da suíte.
  // eslint-disable-next-line jest/expect-expect -- limpa o QueryClient entre casos
  afterEach(() => client?.clear());

  it('renderiza o título da tela', async () => {
    renderReview();

    await screen.findByText('Revisão semanal');
  });

  it('renderiza o botão de fechar e dispara onClose', async () => {
    const { onClose } = renderReview();

    const close = await screen.findByLabelText('Fechar');
    fireEvent.press(close);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('oferece o compartilhamento por imagem e registra o evento', async () => {
    renderReview();

    const share = await screen.findByLabelText('Compartilhar resumo da semana');
    fireEvent.press(share);

    await waitFor(() => expect(shareViewAsImage).toHaveBeenCalled());
    await waitFor(() => expect(track).toHaveBeenCalledWith('peak_score_shared', expect.objectContaining({ surface: 'weekly_review' })));
  });

  it('não busca nada com o modal fechado', () => {
    renderReview({ visible: false });

    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    expect(require('@/lib/network').api.get).not.toHaveBeenCalled();
  });
});
