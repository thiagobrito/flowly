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
  /** Todas as tarefas do usuário (sem filtro de dia), para avaliar filtros de data. */
  tasksAllList: () => ['tasks', 'all'] as const,
  /** Prefixo de todas as listas de tarefas (para invalidação em lote). */
  tasksAll: () => ['tasks'] as const,
  /** Metas com insights computados no servidor. */
  goals: () => ['goals'] as const,
  /** Estatísticas/progresso de um dia. */
  report: (dateKey: string) => ['report', dateKey] as const,
  /**
   * Input do motor de energia usado pela revisão semanal.
   * Depende do perfil de sono: mudar o perfil muda todas as sete curvas.
   */
  weeklyReviewEnergy: (sleepProfileKey: unknown) => ['weeklyReview', 'energy', sleepProfileKey] as const,
  /**
   * Digest dos sete dias. O `wakeTime` entra na chave porque é o que ancora a
   * curva de cada dia — sem ele na chave, uma coleta nova não revalidaria.
   */
  weeklyReviewDigest: (dateKey: string, wakeTime: string | null) => ['weeklyReview', 'digest', dateKey, wakeTime] as const,
  /**
   * Sugestões do coach (server-first).
   *
   * Só o `dateKey` entra na chave: o cache autoritativo no servidor é por dia
   * (24h). Refetch no cliente segue a mesma janela via `staleTime`.
   */
  coachSuggestions: (dateKey: string) => ['coach-suggestions', dateKey] as const,
};
