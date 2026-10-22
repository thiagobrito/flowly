/**
 * Cenários: um mundo inicial por situação que o app precisa suportar.
 *
 * Cenário é mais do que dado — é o estado de conta inteiro (tarefas, assinatura,
 * metas, sono). Nomear cada um permite que o spec diga em uma linha *qual*
 * situação está sendo exercitada.
 */

import { emptyWorld, EXPIRED_SUBSCRIPTION, type FakeWorld, PREMIUM_SUBSCRIPTION, task, TRIAL_SUBSCRIPTION } from './backend';
import { dayKeyOffset, todayKey } from './state';

export type ScenarioName = 'fullDay' | 'newAccount' | 'expiredTrial' | 'premium' | 'serverError' | 'unauthorized';

/** Dia cheio: o estado mais rico, usado como padrão pelos specs de tela. */
function fullDay(): FakeWorld {
  const world = emptyWorld();
  const today = todayKey();

  world.tasks = [
    task({ _id: 'task-meditar', name: 'Meditar 10 minutos', goal: { id: null, name: 'health' }, energy: 1, impact: 4, frequency: { kind: 'daily', everyDay: true, days: [] }, estimatedMinutes: 10 }),
    task({
      _id: 'task-proposta',
      name: 'Escrever proposta comercial',
      description: 'Fechar o escopo antes de enviar',
      goal: { id: null, name: 'career' },
      energy: 5,
      impact: 5,
      frequency: { kind: 'once', date: today, time: '09:00' },
      estimatedMinutes: 90,
      subtasks: [
        { id: 'sub-1', name: 'Levantar requisitos', done: true },
        { id: 'sub-2', name: 'Revisar preço', done: false },
      ],
      schedule: [{ dateTime: `${today}T09:00:00.000Z`, duration: 90 }],
    }),
    task({ _id: 'task-academia', name: 'Ir à academia', goal: { id: null, name: 'health' }, energy: 4, impact: 3, frequency: { kind: 'daily', everyDay: true, days: [] } }),
    task({ _id: 'task-ler', name: 'Ler 20 páginas', goal: { id: null, name: 'learning' }, energy: 2, impact: 2, frequency: { kind: 'daily', everyDay: true, days: [] }, completed: [`${today}T08:00:00.000Z`] }),
    task({ _id: 'task-dentista', name: 'Marcar dentista', goal: { id: null, name: 'health' }, energy: 1, impact: 2, frequency: { kind: 'notime' } }),
    task({ _id: 'task-atrasada', name: 'Enviar relatório da sexta', goal: { id: null, name: 'work' }, energy: 2, impact: 4, frequency: { kind: 'once', date: dayKeyOffset(-3), time: '14:00' } }),
    task({ _id: 'task-amanha', name: 'Revisar orçamento do mês', goal: { id: null, name: 'finance' }, energy: 3, impact: 4, frequency: { kind: 'once', date: dayKeyOffset(1), time: null } }),
  ];

  world.goals = [
    { id: 'goal-career', label: 'career', name: 'Faturar 30 mil por mês', metrics: [{ id: 'metric-mrr', label: 'Faturamento mensal', initial: 12000, current: 18000, target: 30000, unit: 'BRL' }] },
    { id: 'goal-health', label: 'health', name: 'Correr 10 km sem parar' },
  ];
  world.goalLabels = ['career', 'health', 'learning', 'finance'];

  world.sleepLogs = [
    { dateKey: dayKeyOffset(-1), bedTime: '23:10', wakeTime: '07:05', sleepHours: 7.9, source: 'manual' },
    { dateKey: dayKeyOffset(-2), bedTime: '00:20', wakeTime: '07:00', sleepHours: 6.6, source: 'manual' },
  ];

  world.coach = {
    source: 'fallback',
    batchId: 'e2e-batch-1',
    suggestions: [
      { id: 'sug-1', title: 'Comece pela proposta comercial', detail: 'É a tarefa de maior impacto do dia.' },
      { id: 'sug-2', title: 'Reserve 10 minutos para meditar', detail: 'Sua energia rende mais depois.' },
    ],
  };

  return world;
}

function newAccount(): FakeWorld {
  const world = emptyWorld();
  world.subscription = { ...TRIAL_SUBSCRIPTION };
  return world;
}

function expiredTrial(): FakeWorld {
  const world = fullDay();
  world.subscription = { ...EXPIRED_SUBSCRIPTION };
  return world;
}

function premium(): FakeWorld {
  const world = fullDay();
  world.subscription = { ...PREMIUM_SUBSCRIPTION };
  return world;
}

function serverError(): FakeWorld {
  const world = fullDay();
  world.failures = [{ pattern: /^\/(home|tasks|report|goals)/, status: 500, body: { error: 'Internal Server Error' } }];
  return world;
}

function unauthorized(): FakeWorld {
  const world = fullDay();
  // 401 de token expirado em tudo que exige sessão. Header ausente
  // (`missing_authorization`) não pode usar este cenário: o app não desloga.
  world.failures = [{ pattern: /^\/(home|tasks|report|goals|sleep-|subscription|ai\/)/, status: 401, body: { error: 'Unauthorized', code: 'token_expired' } }];
  return world;
}

const BUILDERS: Record<ScenarioName, () => FakeWorld> = { fullDay, newAccount, expiredTrial, premium, serverError, unauthorized };

export function scenario(name: ScenarioName): FakeWorld {
  return BUILDERS[name]();
}
