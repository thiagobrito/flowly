import { mapServerSuggestions } from './aiSuggestions';

describe('mapServerSuggestions', () => {
  it('mapeia texto e ação do servidor', () => {
    const [mapped] = mapServerSuggestions([
      {
        id: 'valley-2',
        title: 'Mova o estudo para as 14h30',
        detail: 'Sua energia é maior ali.',
        action: { type: 'schedule', taskId: 'task-2', startISO: '2026-08-04T14:30:00.000-03:00', durationMin: 45 },
        actionLabel: 'Aplicar',
      },
    ]);

    expect(mapped).toEqual({
      id: 'valley-2',
      title: 'Mova o estudo para as 14h30',
      detail: 'Sua energia é maior ali.',
      action: { type: 'schedule', taskId: 'task-2', startISO: '2026-08-04T14:30:00.000-03:00', durationMin: 45 },
      actionLabel: 'Aplicar',
    });
  });

  it('usa Aplicar como actionLabel padrão quando há ação', () => {
    const [mapped] = mapServerSuggestions([
      {
        id: 'unscheduled-1',
        title: 'Reserve 09:00',
        action: { type: 'schedule', taskId: 't1', startISO: '2026-08-04T09:00:00.000-03:00', durationMin: 60 },
      },
    ]);

    expect(mapped!.actionLabel).toBe('Aplicar');
  });

  it('mantém card só de texto sem ação', () => {
    const [mapped] = mapServerSuggestions([{ id: 'info-1', title: 'Foque no essencial', detail: 'Dia cheio.' }]);

    expect(mapped).toEqual({ id: 'info-1', title: 'Foque no essencial', detail: 'Dia cheio.' });
  });

  it('descarta ids repetidos e títulos vazios', () => {
    const mapped = mapServerSuggestions([
      { id: 'a', title: 'Primeira' },
      { id: 'a', title: 'Repetida' },
      { id: 'b', title: '   ' },
    ]);

    expect(mapped.map((item) => item.id)).toEqual(['a']);
  });

  it('devolve lista vazia sem resposta do servidor', () => {
    expect(mapServerSuggestions(null)).toEqual([]);
    expect(mapServerSuggestions([])).toEqual([]);
  });
});
