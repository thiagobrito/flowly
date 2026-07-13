/**
 * Chaves centralizadas do React Query.
 *
 * Manter as chaves em um único lugar evita divergência entre quem lê
 * (`useQuery`) e quem invalida/atualiza o cache (`useMutation`), o que é a
 * fonte mais comum de bugs de sincronismo entre telas.
 */

export const queryKeys = {
  /** Lista de tarefas de um dia, priorizada pelo nível de energia informado. */
  tasks: (dateKey: string, energyLevel: number) => ['tasks', 'list', dateKey, energyLevel] as const,
  /** Tarefas do calendário para um dia (agendadas + concluídas). */
  tasksCalendar: (dateKey: string) => ['tasks', 'calendar', dateKey] as const,
  /** Prefixo de todas as listas de tarefas (para invalidação em lote). */
  tasksAll: () => ['tasks'] as const,
  /** Metas com insights computados no servidor. */
  goals: () => ['goals'] as const,
  /** Estatísticas/progresso de um dia. */
  report: (dateKey: string) => ['report', dateKey] as const,
};
