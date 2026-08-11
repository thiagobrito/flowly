/**
 * Backend falso em memória para o modo mock.
 *
 * Fixtures estáticas testam apenas a renderização: criar uma tarefa não aparece
 * na lista, concluir não muda nada. Aqui o estado é mutável, então os fluxos de
 * escrita são exercitados de verdade — inclusive a invalidação de cache do React
 * Query, que é onde os bugs de "salvei e não apareceu" moram.
 *
 * A forma das respostas espelha o backend real; o contrato é travado pela suíte
 * de API do repo `flowly-web`, e o modo integração (`E2E_API_URL`) roda os mesmos
 * specs contra o servidor de verdade.
 */

import { dayKeyOffset, todayKey } from './state';

export type FakeTask = {
  _id: string;
  name: string;
  description?: string;
  /**
   * Id da área da vida, como o app envia no payload de criação.
   *
   * O documento real guarda `area` *e* `goal` — o `createTask` do servidor
   * persiste o payload inteiro. O formulário de edição depende de `area` para
   * pré-selecionar o chip; sem ela, salvar fica bloqueado.
   */
  area: string;
  goal: { id: string | null; name: string };
  energy?: number;
  impact?: number;
  frequency: Record<string, unknown>;
  completed: string[];
  completedCount?: number;
  subtasks?: { id: string; name: string; done: boolean }[];
  estimatedMinutes?: number | null;
  schedule?: { dateTime: string; duration: number }[];
};

export type FakeSubscription = {
  status: 'trial' | 'active' | 'expired' | 'none';
  isPremium: boolean;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  plan?: string | null;
};

export type StoredGoal = {
  id: string;
  label: string;
  name: string;
  rpm?: { result: string; purpose: string; impact: string };
  metrics?: { id: string; label: string; initial: number; current: number; target: number; unit: string }[];
  status?: string;
};

export type FakeSleepProfile = {
  hasDevice: boolean | null;
  usualWakeTime: string | null;
  usualBedTime: string | null;
  /** Correções manuais por dia de acordar (`YYYY-MM-DD`). */
  overrides: Record<string, { wakeTime?: string; bedTime?: string }>;
};

export type FakeWorld = {
  tasks: FakeTask[];
  subscription: FakeSubscription;
  /** Primeira meta é a principal; as demais, secundárias (como o backend real). */
  goals: StoredGoal[];
  goalLabels: string[];
  sleepProfile: FakeSleepProfile | null;
  sleepLogs: Record<string, unknown>[];
  coach: { source: string; batchId: string; suggestions: { id: string; title: string; detail?: string }[] } | null;
  /** Respostas de erro forçadas por caminho, para os cenários de falha. */
  failures: { pattern: RegExp; status: number; body?: unknown }[];
};

let nextId = 1;

function makeId(): string {
  nextId += 1;
  return `e2e-task-${nextId}`;
}

export function task(partial: Partial<FakeTask> & { name: string }): FakeTask {
  const goal = partial.goal ?? { id: null, name: 'health' };

  return {
    _id: partial._id ?? makeId(),
    name: partial.name,
    description: partial.description,
    area: partial.area ?? goal.name,
    goal,
    energy: partial.energy ?? 3,
    impact: partial.impact ?? 3,
    frequency: partial.frequency ?? { kind: 'notime' },
    completed: partial.completed ?? [],
    completedCount: partial.completedCount ?? partial.completed?.length ?? 0,
    subtasks: partial.subtasks,
    estimatedMinutes: partial.estimatedMinutes ?? null,
    schedule: partial.schedule,
  };
}

export const TRIAL_SUBSCRIPTION: FakeSubscription = { status: 'trial', isPremium: true, trialEndsAt: `${dayKeyOffset(5)}T00:00:00.000Z`, plan: null };
export const PREMIUM_SUBSCRIPTION: FakeSubscription = { status: 'active', isPremium: true, currentPeriodEnd: `${dayKeyOffset(300)}T00:00:00.000Z`, plan: 'flowly_yearly' };
export const EXPIRED_SUBSCRIPTION: FakeSubscription = { status: 'expired', isPremium: false, trialEndsAt: `${dayKeyOffset(-2)}T00:00:00.000Z`, plan: null };

export function emptyWorld(): FakeWorld {
  return {
    tasks: [],
    subscription: { ...TRIAL_SUBSCRIPTION },
    goals: [],
    goalLabels: [],
    sleepProfile: { hasDevice: false, usualWakeTime: '07:00', usualBedTime: '23:00', overrides: {} },
    sleepLogs: [],
    coach: null,
    failures: [],
  };
}

const dayOf = (value: unknown): string => String(value ?? '').split('T')[0] ?? '';

/** Tarefa prevista para o dia (mesma leitura de `FilterTasksToShow`, simplificada). */
function isScheduledFor(item: FakeTask, dayKey: string): boolean {
  const frequency = item.frequency as { kind?: string; date?: string; everyDay?: boolean; days?: number[] };

  if (frequency.kind === 'daily') {
    if (frequency.everyDay) return true;
    const weekday = new Date(`${dayKey}T12:00:00.000Z`).getUTCDay();
    return Boolean(frequency.days?.includes(weekday));
  }
  if (frequency.kind === 'once') return frequency.date === dayKey;
  if (frequency.kind === 'weekly' || frequency.kind === 'interval') return true;
  return false;
}

const isDone = (item: FakeTask, dayKey: string): boolean => item.completed.some((iso) => dayOf(iso) === dayKey);

/** Payload de `GET /home`, com o pool indexado que o cliente resolve por posição. */
export function buildHome(world: FakeWorld, dayKey: string) {
  const pool: FakeTask[] = [];
  const indexById = new Map<string, number>();

  const add = (item: FakeTask): number => {
    const existing = indexById.get(item._id);
    if (existing !== undefined) return existing;
    const index = pool.length;
    indexById.set(item._id, index);
    pool.push({ ...item, completedCount: item.completed.length });
    return index;
  };

  const forToday = world.tasks.filter((item) => isScheduledFor(item, dayKey));
  const visible = forToday.filter((item) => !isDone(item, dayKey));
  const concluded = forToday.filter((item) => isDone(item, dayKey));

  const weekKeys = Array.from({ length: 7 }, (_unused, offset) => dayKeyOffset(offset));

  return {
    success: true,
    today: {
      // Mais impacto primeiro, como a priorização do servidor.
      visible: [...visible].sort((left, right) => (right.impact ?? 0) - (left.impact ?? 0)).map(add),
      concluded: concluded.map(add),
    },
    week: {
      byDate: Object.fromEntries(weekKeys.map((key) => [key, world.tasks.filter((item) => isScheduledFor(item, key) && !isDone(item, key)).map(add)])),
      tomorrowKey: dayKeyOffset(1),
    },
    nodate: world.tasks.filter((item) => (item.frequency as { kind?: string }).kind === 'notime').map(add),
    subscription: world.subscription,
    sleepProfile: world.sleepProfile,
    coach: world.coach,
    tasks: pool,
  };
}

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const score = (item: FakeTask): number => (item.energy ?? 0) + (item.impact ?? 0) ** 2;

/**
 * Payload de `GET /report`.
 *
 * Espelha `web/src/lib/report/progress.js`: a tela de Estatísticas quebra com
 * qualquer campo ausente (`days`, `daily.areas`, `stats`, `metrics`), então a
 * fixture precisa ter a mesma forma, não só os números certos.
 */
export function buildProgress(world: FakeWorld, dayKey: string) {
  const forDay = world.tasks.filter((item) => isScheduledFor(item, dayKey));
  const concluded = forDay.filter((item) => isDone(item, dayKey));
  const visible = forDay.filter((item) => !isDone(item, dayKey));
  const total = concluded.length + visible.length;

  const days = [-2, -1, 0, 1, 2].map((offset) => {
    const dayDate = new Date(`${dayKey}T12:00:00.000Z`);
    dayDate.setUTCDate(dayDate.getUTCDate() + offset);
    const key = dayDate.toISOString().slice(0, 10);
    const day = Number(key.slice(8, 10));
    if (offset !== 0) return { date: key, day };
    return { date: key, day, label: `Hoje, ${day} ${MONTHS_PT[dayDate.getUTCMonth()]}`, isToday: true };
  });

  const pointsByArea = new Map<string, number>();
  for (const item of concluded) {
    const area = item.goal.name ?? 'outros';
    pointsByArea.set(area, (pointsByArea.get(area) ?? 0) + score(item));
  }
  const ordered = [...pointsByArea.entries()].sort((left, right) => right[1] - left[1]);

  const habitPoints = concluded.filter((item) => ['daily', 'weekly'].includes(String((item.frequency as { kind?: string }).kind))).reduce((sum, item) => sum + score(item), 0);
  const onceTasks = forDay.filter((item) => (item.frequency as { kind?: string }).kind === 'once');
  const adherence = onceTasks.length > 0 ? Math.round((onceTasks.filter((item) => isDone(item, dayKey)).length / onceTasks.length) * 100) : 0;

  return {
    title: 'Progresso',
    date: dayKey,
    selectedDay: dayKey,
    totalScore: concluded.reduce((sum, item) => sum + score(item), 0),
    totalPoints: concluded.reduce((sum, item) => sum + score(item), 0),
    averageFromLast7Days: concluded.length > 0 ? concluded.reduce((sum, item) => sum + score(item), 0) : 0,
    impactScore: concluded.reduce((sum, item) => sum + (item.energy ?? 0) * (item.impact ?? 0) ** 2, 0),
    energyScore: concluded.reduce((sum, item) => sum + (item.energy ?? 0), 0),
    days,
    daily: {
      title: 'Tarefas concluídas',
      concludedTasks: concluded.length,
      percent: total > 0 ? Math.round((concluded.length / total) * 100) : 0,
      areas: ['health', 'work', 'studies'],
    },
    stats: ordered.map(([area, points], index) => ({
      id: area.toLowerCase(),
      value: String(points),
      label: `Pontos em ${area.charAt(0).toUpperCase()}${area.slice(1).toLowerCase()}`,
      area: area.toLowerCase(),
      ...(index === 0 ? { highlighted: true } : {}),
    })),
    metrics: [
      { id: 'calories', label: 'Hábitos', value: String(habitPoints), unit: 'pontos', accent: '#f97316' },
      { id: 'steps', label: 'Cumpre o que prometeu', value: `${adherence}%`, accent: '#3b82f6' },
    ],
    concludedTasks: concluded,
    visibleTasks: visible,
  };
}

/**
 * Meta no formato de `buildGoals` do servidor.
 *
 * A tela de Metas depende de campos derivados (`progress`, `health`, `trend`,
 * `confidence`) que não existem no documento salvo. Números fixos bastam: o que
 * está sendo testado é a tela, não o cálculo — esse é coberto no repo da API.
 */
export function buildGoal(world: FakeWorld, goal: StoredGoal, type: 'primary' | 'secondary') {
  const linked = world.tasks.filter((item) => item.goal.name?.toLowerCase() === goal.label?.toLowerCase());

  return {
    id: goal.id,
    name: goal.name,
    areaId: goal.label,
    type,
    status: goal.status ?? 'active',
    rpm: goal.rpm ?? { result: `Avançar de forma consistente em "${goal.name}".`, purpose: 'Manter foco e progresso contínuo neste objetivo.', impact: 'Aproximar-me da visão que defini para esta área.' },
    points: linked.reduce((sum, item) => sum + score(item), 0),
    progress: 42,
    daysRemaining: 60,
    weeksCompleted: 3,
    totalWeeks: 12,
    metrics: goal.metrics ?? [],
    consistencyScore: 70,
    weeklyStreak: 2,
    trend: 'stable',
    confidence: 6,
    health: [
      { id: `${goal.id}-pace`, level: 'yellow', label: 'Progresso levemente abaixo do ritmo' },
      { id: `${goal.id}-habits`, level: 'yellow', label: 'Consistência pode melhorar' },
      { id: `${goal.id}-weekly`, level: 'yellow', label: 'Compromissos semanais irregulares' },
    ],
  };
}

export type FakeResponse = { status: number; body: unknown };

const ok = (body: unknown): FakeResponse => ({ status: 200, body });

/**
 * Resolve uma requisição contra o mundo em memória.
 *
 * Devolve `null` para caminho não mapeado — o interceptador transforma isso em
 * 404 e a varredura acusa, o que é o comportamento desejado: rota nova no app
 * sem fixture correspondente é um furo de cobertura, não um teste verde.
 */
export function handle(world: FakeWorld, method: string, path: string, query: URLSearchParams, body: unknown): FakeResponse | null {
  const forced = world.failures.find((failure) => failure.pattern.test(path));
  if (forced) return { status: forced.status, body: forced.body ?? { error: 'forçado pelo cenário' } };

  const payload = (body ?? {}) as Record<string, any>;
  const findTask = (id: unknown) => world.tasks.find((item) => item._id === String(id));

  if (method === 'GET' && path === '/home') {
    return ok(buildHome(world, dayOf(query.get('date')) || todayKey()));
  }

  if (path === '/tasks' && method === 'GET') {
    const scope = query.get('scope');
    const area = query.get('area');
    if (scope === 'all') return ok({ success: true, tasks: world.tasks });
    if (area) return ok({ success: true, tasks: world.tasks.filter((item) => item.goal.name?.toLowerCase() === area.toLowerCase()) });

    const dayKey = dayOf(query.get('date')) || todayKey();
    const forToday = world.tasks.filter((item) => isScheduledFor(item, dayKey));
    return ok({
      success: true,
      visibleTasks: forToday.filter((item) => !isDone(item, dayKey)),
      concludedTasks: forToday.filter((item) => isDone(item, dayKey)),
    });
  }

  if (path === '/tasks' && (method === 'PUT' || method === 'PATCH')) {
    if (payload.isEditing && payload.id) {
      const existing = findTask(payload.id);
      if (!existing) return { status: 404, body: { error: 'Task not found' } };
      Object.assign(existing, {
        name: payload.name ?? existing.name,
        description: payload.description,
        energy: payload.energy ?? existing.energy,
        impact: payload.impact ?? existing.impact,
        frequency: payload.frequency ?? existing.frequency,
        area: payload.area ?? existing.area,
        goal: { id: null, name: payload.area ?? existing.goal.name },
        subtasks: payload.subtasks ?? existing.subtasks,
        estimatedMinutes: payload.estimatedMinutes ?? existing.estimatedMinutes,
      });
      return ok({ success: true, result: { matchedCount: 1 } });
    }

    const created = task({
      name: payload.name,
      description: payload.description,
      energy: payload.energy,
      impact: payload.impact,
      frequency: payload.frequency,
      area: payload.area,
      goal: { id: null, name: payload.area ?? 'health' },
      subtasks: payload.subtasks,
      estimatedMinutes: payload.estimatedMinutes,
    });
    world.tasks.push(created);
    return ok({ success: true, result: { insertedId: created._id } });
  }

  if (path === '/tasks' && method === 'DELETE') {
    const id = query.get('id');
    world.tasks = world.tasks.filter((item) => item._id !== id);
    return ok({ success: true });
  }

  if (path === '/tasks/complete' && method === 'POST') {
    const target = findTask(payload.taskId);
    if (!target) return { status: 404, body: { error: 'Task not found' } };
    const day = dayOf(payload.date);
    if (!isDone(target, day)) target.completed.push(payload.date);
    return ok({ success: true });
  }

  if (path === '/tasks/undo' && method === 'POST') {
    const target = findTask(payload.taskId);
    if (!target) return { status: 404, body: { error: 'Task not found' } };
    const day = dayOf(payload.date);
    if (!isDone(target, day)) return { status: 404, body: { error: 'Task not found' } };
    target.completed = target.completed.filter((iso) => dayOf(iso) !== day);
    return ok({ success: true });
  }

  if (path === '/tasks/subtask' && method === 'POST') {
    const target = findTask(payload.taskId);
    const subtask = target?.subtasks?.find((item) => item.id === payload.subtaskId);
    if (subtask) subtask.done = Boolean(payload.done);
    return ok({ success: true });
  }

  if (path === '/tasks/schedule' && method === 'POST') {
    const target = findTask(payload.taskId);
    if (!target) return { status: 404, body: { error: 'Task not found' } };
    const day = dayOf(payload.startISO);
    target.schedule = [...(target.schedule ?? []).filter((slot) => dayOf(slot.dateTime) !== day), { dateTime: payload.startISO, duration: payload.durationMin }];
    return ok({ success: true });
  }

  if (path === '/tasks/schedule' && method === 'DELETE') {
    const target = findTask(query.get('id'));
    if (!target) return { status: 404, body: { error: 'Task not found' } };
    const day = query.get('date');
    target.schedule = (target.schedule ?? []).filter((slot) => dayOf(slot.dateTime) !== day);
    return ok({ success: true });
  }

  if (path === '/goals' && method === 'GET') return ok(world.goals.map((goal, index) => buildGoal(world, goal, index === 0 ? 'primary' : 'secondary')));
  if (path === '/goals' && method === 'PUT') {
    const stored = { id: payload.id || `goal-${world.goals.length + 1}`, label: payload.areaId ?? payload.label, name: payload.name, rpm: payload.rpm, metrics: payload.metrics ?? [], status: payload.status ?? 'active' };
    if (payload.type === 'secondary') {
      if (world.goals.length === 0) return { status: 404, body: { error: 'User main goal not found' } };
      world.goals = [...world.goals.filter((goal) => goal.id !== stored.id), stored];
    } else {
      world.goals = [stored, ...world.goals.slice(1)];
    }
    if (stored.label) world.goalLabels = [...new Set([...world.goalLabels, stored.label])];
    return ok({ success: true, result: stored });
  }
  if (path === '/goals' && method === 'DELETE') {
    const id = query.get('id');
    world.goals = id ? world.goals.filter((goal) => goal.id !== id) : [];
    return ok({ success: true });
  }
  if (path === '/goals/labels') return ok(world.goalLabels);

  // Criação do ciclo inteiro (principal + secundárias) num POST, como o app faz
  // ao terminar a anamnese. O servidor é quem gera os ids.
  if (path === '/goals/anamnesis' && method === 'POST') {
    const toStored = (goal: Record<string, unknown>, index: number): StoredGoal => ({
      id: `goal-${index + 1}`,
      label: String(goal.label ?? ''),
      name: String(goal.name ?? ''),
      rpm: goal.rpm as StoredGoal['rpm'],
      metrics: (goal.metrics as StoredGoal['metrics']) ?? [],
      status: 'active',
    });

    const secondary = Array.isArray(payload.secondaryGoals) ? (payload.secondaryGoals as Record<string, unknown>[]) : [];
    world.goals = [payload.mainGoal as Record<string, unknown>, ...secondary].map(toStored);
    world.goalLabels = [...new Set(world.goals.map((goal) => goal.label).filter(Boolean))];
    return ok({ success: true });
  }

  if (path === '/goals/anamnesis' && method === 'GET') {
    return ok([
      { id: 'intro', kind: 'intro', title: 'Vamos desenhar seu próximo ciclo', subtitle: 'Algumas perguntas rápidas.', icon: 'Sparkles' },
      { id: 'main-area', kind: 'lifeArea', title: 'Qual área da vida é a sua prioridade agora?', icon: 'Target', required: true },
      { id: 'main-name', kind: 'text', field: 'mainGoal.name', title: 'Qual é a meta principal?', icon: 'Target', required: true },
    ]);
  }

  if (path === '/report') {
    return ok({ success: true, data: buildProgress(world, dayOf(query.get('date')) || todayKey()) });
  }

  if (path === '/subscription' && method === 'GET') return ok(world.subscription);
  if (path === '/subscription/payment' && method === 'POST') {
    world.subscription = { ...PREMIUM_SUBSCRIPTION };
    return ok(world.subscription);
  }

  if (path === '/sleep-profile' && method === 'GET') return ok({ success: true, profile: world.sleepProfile });
  if (path === '/sleep-profile' && method === 'PUT') {
    world.sleepProfile = payload as unknown as FakeSleepProfile;
    return ok({ success: true, profile: world.sleepProfile });
  }
  if (path === '/sleep-log' && method === 'GET') return ok({ success: true, logs: world.sleepLogs });
  if (path === '/sleep-log' && method === 'POST') {
    const nights = Array.isArray(payload.nights) ? payload.nights : [];
    world.sleepLogs = [...nights, ...world.sleepLogs].slice(0, 30);
    return ok({ success: true, count: nights.length, nights });
  }

  if (path === '/ai/coach-suggestions' && method === 'POST') {
    return ok(world.coach ?? { success: true, source: 'fallback', batchId: 'e2e-batch', suggestions: [] });
  }
  if (path === '/ai/coach-suggestions/feedback' && method === 'POST') {
    if (world.coach) {
      world.coach = { ...world.coach, suggestions: world.coach.suggestions.filter((item) => item.id !== payload.suggestionId) };
    }
    return ok({ success: true });
  }

  if (path === '/feature-flags') return ok({ trialDays: 7 });
  if (path === '/events' && method === 'POST') return ok({ success: true, count: Array.isArray(payload.events) ? payload.events.length : 0 });

  if (path === '/auth/login' || path === '/auth/register') {
    return ok({ token: 'E2E_TOKEN', user: { email: payload.email } });
  }
  if (path === '/auth/delete') return ok({ success: true });

  return null;
}
