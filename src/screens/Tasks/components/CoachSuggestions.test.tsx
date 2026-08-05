import { fireEvent, render, screen } from '@testing-library/react-native';

import type { CoachInsight } from '@/lib/coach';

import CoachSuggestions from './CoachSuggestions';

const insight = (overrides: Partial<CoachInsight> = {}): CoachInsight => ({
  id: 'unscheduled-1',
  title: 'Reserve 09:00 para "Deep work"',
  detail: 'Impacto 5/5 e ainda sem horário.',
  actionLabel: 'Aplicar',
  action: { type: 'schedule', taskId: 'task-1', startISO: '2026-08-04T09:00:00.000-03:00', durationMin: 60 },
  ...overrides,
});

function setup(props: Partial<React.ComponentProps<typeof CoachSuggestions>> = {}) {
  const onApply = jest.fn();
  const onDismiss = jest.fn();

  render(<CoachSuggestions insights={[insight()]} isDark={false} applyingId={null} onApply={onApply} onDismiss={onDismiss} {...props} />);

  return { onApply, onDismiss };
}

describe('CoachSuggestions', () => {
  it('mostra título e detalhe da sugestão', () => {
    setup();

    expect(screen.getByText('Sugestões do dia')).toBeTruthy();
    expect(screen.getByText('Reserve 09:00 para "Deep work"')).toBeTruthy();
    expect(screen.getByText('Impacto 5/5 e ainda sem horário.')).toBeTruthy();
  });

  it('não renderiza nada sem sugestões', () => {
    setup({ insights: [] });

    expect(screen.queryByText('Sugestões do dia')).toBeNull();
  });

  it('chama onApply com a sugestão tocada', () => {
    const { onApply } = setup();

    fireEvent.press(screen.getByLabelText('Aplicar'));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'unscheduled-1' }));
  });

  it('chama onDismiss em "Agora não"', () => {
    const { onDismiss } = setup();

    fireEvent.press(screen.getByLabelText('Dispensar'));

    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'unscheduled-1' }));
  });

  // Aplicar dispara uma escrita no servidor: um segundo toque agendaria de novo.
  it('desabilita os dois botões durante o apply', () => {
    const { onApply, onDismiss } = setup({ applyingId: 'unscheduled-1' });

    fireEvent.press(screen.getByLabelText('Aplicar'));
    fireEvent.press(screen.getByLabelText('Dispensar'));

    expect(onApply).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('mantém os botões ativos quando outra sugestão está sendo aplicada', () => {
    const { onApply } = setup({ applyingId: 'outra-sugestao' });

    fireEvent.press(screen.getByLabelText('Aplicar'));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('esconde os botões quando a sugestão não é acionável', () => {
    setup({ insights: [insight({ action: undefined })] });

    expect(screen.queryByLabelText('Aplicar')).toBeNull();
    expect(screen.queryByLabelText('Dispensar')).toBeNull();
  });

  it('usa o actionLabel da sugestão quando ele existe', () => {
    setup({ insights: [insight({ actionLabel: 'Remarcar' })] });

    expect(screen.getByLabelText('Remarcar')).toBeTruthy();
  });
});
