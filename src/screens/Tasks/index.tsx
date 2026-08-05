import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';

import ModalScreen from '@/components/ModalScreen';
import PeakEnergyCard from '@/components/PeakEnergyCard';
import { buildCandidates, buildMobileDayCurve, type CoachInsight, loadDismissedForToday, LOW_SLEEP_HOURS, MAX_RECOMMENDATIONS, quantizeNow, saveDismissedForToday, useAiCoachSuggestions } from '@/lib/coach';
import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, type FlowlyEngineInput, flowlyInputFromMetrics, getHealthProvider } from '@/lib/energy';
import { applyEnergyMode, type EnergyMode, type EngineEnergy, filterTasksForMode, loadEnergyModeForToday, saveEnergyModeForToday } from '@/lib/energyMode';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';
import { useSubscription } from '@/lib/subscription';
import { track } from '@/lib/telemetry';

import { syncTaskScheduleToServer } from '../Calendar/scheduleSync';
import { useNotificationTest } from '../Config/hooks/useNotificationTest';
import NotificationTestModal from '../Config/NotificationTestModal';
import type { Task } from '../NewTask/data';
import { getLifeArea } from '../NewTask/data';
import Subscription from '../Subscription';
import CoachSuggestions from './components/CoachSuggestions';
import EnergyModeSheet from './components/EnergyModeSheet';
import type { FilterArea } from './components/FilterDrawer';
import FilterDrawer from './components/FilterDrawer';
import Header from './components/Header';
import RushedEmptyState from './components/RushedEmptyState';
import TaskCard from './components/TaskCard';
import { moveTask, removeTaskFromLists, type TasksData } from './taskCache';
import { DATE_FILTERS, type DateFilterId, getTomorrowDate, getWeekDates, taskMatchesDateFilter } from './taskDateFilter';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
  onOpenConfig?: () => void;
};

function OrganizeTasks(tasks: any): Task[] {
  return tasks.map((task: any, index: number) => {
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    const id = task.id ?? (task as Task & { _id?: string })._id ?? '';
    return {
      ...task,
      id,
      // Chave estável entre refetches (id + posição) para o React reconciliar as listas.
      randomId: `${id || 'task'}-${index}`,
    };
  });
}

async function fetchTodayTasks(energyLevel: number): Promise<{ visibleTasks: Task[]; concludedTasks: Task[] }> {
  const today = toLocalISOString();
  const results = await api.get<any>('/tasks', {
    params: { date: today, energyLevel },
  });

  const visibleTasks = OrganizeTasks(results.visibleTasks);
  const concludedTasks = OrganizeTasks(results.concludedTasks);

  return { visibleTasks, concludedTasks };
}

// Todas as tarefas do usuário (sem filtro de dia). Necessário para o filtro
// "Sem data", que é um conceito client-side (o servidor não tem esse recorte).
async function fetchAllTasks(): Promise<Task[]> {
  const results = await api.get<any>('/tasks', { params: { scope: 'all' } });
  return OrganizeTasks(results.tasks ?? []);
}

// Busca as tarefas de um dia específico direto do servidor (fonte da verdade,
// via `FilterTasksToShow`), no mesmo formato do Calendário: visíveis + concluídas
// com a flag `done`. A energia é fixa (5) para manter o cache estável e
// compartilhado com a tela de Calendário (chave `tasksCalendar`).
async function fetchDayTasks(dateISO: string): Promise<Task[]> {
  const response = await api.get<any>('/tasks', { params: { date: dateISO, energyLevel: 5 } });
  const combined = [...(response.visibleTasks ?? []).map((task: Task) => ({ ...task, done: false })), ...(response.concludedTasks ?? []).map((task: Task) => ({ ...task, done: true }))];
  return OrganizeTasks(combined);
}

/**
 * Identidade dos campos do input que mudam a curva de energia. Serve para
 * descartar coletas que devolvem um objeto novo com o mesmo conteúdo.
 */
function energyInputFingerprint(input: FlowlyEngineInput | null): string {
  if (!input) return 'none';

  const history = (input.sleepHistory ?? []).map((night) => `${night.date}:${night.sleepHours}`).join(',');
  return [input.wakeTime, input.bedTime, input.lastNightSleepHours, input.sleepNeedHours, input.hrvMs, input.restingHeartRate, history].join('|');
}

export default function Tasks({ onEdit, onLogout, onOpenConfig }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [engineScore, setEngineScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);
  const [energyReady, setEnergyReady] = useState<boolean>(false);
  const [energyMode, setEnergyMode] = useState<EnergyMode>('ideal');
  const [energyModeOpen, setEnergyModeOpen] = useState(false);
  const [energyInput, setEnergyInput] = useState<FlowlyEngineInput | null>(null);
  const [lastNightSleepHours, setLastNightSleepHours] = useState<number | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  // `now` quantizado em slots de 15 min: em `new Date()` cru, o slot mais cedo
  // possível anda a cada segundo e as sugestões trocam de horário sozinhas.
  const [nowSlot, setNowSlot] = useState(() => quantizeNow(new Date()));
  const [applyingInsightId, setApplyingInsightId] = useState<string | null>(null);
  const energyModeRef = useRef<EnergyMode>('ideal');
  energyModeRef.current = energyMode;
  // Par (score, nível) do motor no último refresh. Guardado em ref para que a
  // escolha de modo use o valor do instante da escolha, não um render antigo.
  const engineRef = useRef<EngineEnergy>({ score: 0, level: 0 });
  const hoursAwakeRef = useRef(0);
  const hasHealthDataRef = useRef(false);

  // A chave inclui o dia e o nível de energia (arredondado, para não recriar
  // uma entrada de cache a cada micro-variação da coleta de 60s).
  const dateKey = localDateKey();
  const roundedEnergy = Math.round(energyLevel);
  const tasksKey = useMemo(() => queryKeys.tasks(dateKey, roundedEnergy), [dateKey, roundedEnergy]);

  const tasksQuery = useQuery<TasksData>({
    queryKey: tasksKey,
    queryFn: () => fetchTodayTasks(roundedEnergy),
    enabled: energyReady,
  });

  const allTasksQuery = useQuery<Task[]>({
    queryKey: queryKeys.tasksAllList(),
    queryFn: fetchAllTasks,
  });

  const visibleTasks = useMemo(() => tasksQuery.data?.visibleTasks ?? [], [tasksQuery.data]);
  const concludedTasks = useMemo(() => tasksQuery.data?.concludedTasks ?? [], [tasksQuery.data]);
  const allUserTasks = useMemo(() => allTasksQuery.data ?? [], [allTasksQuery.data]);
  // Spinner só na primeiríssima carga (sem cache) — ao voltar para a Home o
  // conteúdo do cache aparece instantaneamente.
  const loading = !energyReady || tasksQuery.isLoading;

  const [filterOpen, setFilterOpen] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterId | null>(null);

  const { showNow, showIn30Seconds } = useNotificationTest();

  // Perfil de sono: fallback do Energy Score para quem não tem wearable.
  // Ref mantém `refreshEnergy` estável (o intervalo de 60s pega o valor atual).
  const { profile: sleepProfile } = useSleepProfile();
  const sleepProfileRef = useRef(sleepProfile);
  sleepProfileRef.current = sleepProfile;

  // Trial/assinatura: permite assinar a qualquer momento (dia 0 inclusive).
  // Os dias restantes vêm do banco, via `GET /subscription`.
  const { isPremium, isTrialing, trialDaysLeft } = useSubscription();
  const showTrialBanner = isTrialing;
  const showLockedBanner = !isPremium && !isTrialing;

  const allTasks = useMemo(() => [...visibleTasks, ...concludedTasks], [visibleTasks, concludedTasks]);

  // Amanhã/Esta semana produzem uma lista única (sem separar "concluídas", pois
  // conclusão é por dia e dias futuros não têm conclusão).
  const isFutureFilter = selectedDateFilter === 'tomorrow' || selectedDateFilter === 'thisWeek';

  // "Amanhã" e "Esta semana" seguem o modelo do Calendário: buscam cada dia
  // direto do servidor (fonte da verdade), em vez de reimplementar a recorrência
  // no cliente. As queries só disparam quando o drawer está aberto ou o filtro
  // está ativo, e compartilham o cache `tasksCalendar` com o Calendário.
  const tomorrowDate = useMemo(() => getTomorrowDate(startOfLocalDay(dateKey)), [dateKey]);
  const tomorrowKey = localDateKey(tomorrowDate);
  // A regra de dívida de sono agenda para amanhã, então precisa da agenda de
  // amanhã para não sugerir um horário já ocupado. Fora desse caso, a busca
  // continua sob demanda.
  const sleepDebtActive = lastNightSleepHours != null && lastNightSleepHours < LOW_SLEEP_HOURS;
  const wantTomorrow = filterOpen || selectedDateFilter === 'tomorrow' || sleepDebtActive;

  const tomorrowQuery = useQuery<Task[]>({
    queryKey: queryKeys.tasksCalendar(tomorrowKey),
    queryFn: () => fetchDayTasks(toLocalISOString(tomorrowDate)),
    enabled: energyReady && wantTomorrow,
  });
  const tomorrowTasks = useMemo(() => (tomorrowQuery.data ?? []).filter((task) => !task.done), [tomorrowQuery.data]);

  const weekDates = useMemo(() => getWeekDates(startOfLocalDay(dateKey)), [dateKey]);
  const wantWeek = filterOpen || selectedDateFilter === 'thisWeek';

  const week = useQueries({
    queries: weekDates.map((day) => ({
      queryKey: queryKeys.tasksCalendar(localDateKey(day)),
      queryFn: () => fetchDayTasks(toLocalISOString(day)),
      enabled: energyReady && wantWeek,
    })),
    combine: (results) => {
      const byId = new Map<string, Task>();
      results.forEach((result) =>
        (result.data ?? []).forEach((task) => {
          if (!task.done && !byId.has(task.id)) byId.set(task.id, task);
        }),
      );
      return { tasks: Array.from(byId.values()), isLoading: results.some((result) => result.isLoading) };
    },
  });

  const matchesArea = useCallback((task: Task) => selectedAreas.length === 0 || selectedAreas.includes(task.goal.name), [selectedAreas]);

  // Contagens dos filtros: Hoje/Amanhã/Esta semana vêm dos dados reais do
  // servidor; "Sem data" continua sendo um recorte client-side sobre a lista
  // completa do usuário.
  const filterDateOptions = useMemo(
    () =>
      DATE_FILTERS.map((filter) => {
        let count = 0;
        if (filter.id === 'today') count = visibleTasks.length + concludedTasks.length;
        else if (filter.id === 'tomorrow') count = tomorrowTasks.length;
        else if (filter.id === 'thisWeek') count = week.tasks.length;
        else count = allUserTasks.filter((task) => taskMatchesDateFilter(task, 'nodate')).length;
        return { ...filter, count };
      }),
    [visibleTasks.length, concludedTasks.length, tomorrowTasks, week.tasks, allUserTasks],
  );

  // As opções de área derivam da fonte do filtro ativo, senão áreas presentes só
  // no dia/semana selecionados não apareceriam para filtrar.
  const filterAreas = useMemo<FilterArea[]>(() => {
    let source = allTasks;
    if (selectedDateFilter === 'tomorrow') source = tomorrowTasks;
    else if (selectedDateFilter === 'thisWeek') source = week.tasks;

    const counts = new Map<string, number>();
    source.forEach((task) => {
      counts.set(task.goal.name, (counts.get(task.goal.name) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([id, count]) => {
      const area = getLifeArea(id);
      return {
        id,
        label: area?.label ?? id,
        Icon: area?.Icon ?? GoalIcon,
        accent: area?.accent ?? '#71717a',
        count,
      };
    });
  }, [selectedDateFilter, tomorrowTasks, week.tasks, allTasks]);

  const applyFilters = useCallback(
    (tasks: Task[]) =>
      tasks.filter((task) => {
        const dateOk = !selectedDateFilter || taskMatchesDateFilter(task, selectedDateFilter);
        return matchesArea(task) && dateOk;
      }),
    [matchesArea, selectedDateFilter],
  );

  const filteredVisible = useMemo(() => {
    let list: Task[];
    if (selectedDateFilter === 'tomorrow') list = tomorrowTasks.filter(matchesArea);
    else if (selectedDateFilter === 'thisWeek') list = week.tasks.filter(matchesArea);
    else if (selectedDateFilter === 'nodate') list = allUserTasks.filter((task) => taskMatchesDateFilter(task, 'nodate') && matchesArea(task));
    else list = applyFilters(visibleTasks);
    return filterTasksForMode(list, energyMode);
  }, [selectedDateFilter, tomorrowTasks, week.tasks, allUserTasks, matchesArea, visibleTasks, applyFilters, energyMode]);

  // Concluídas ficam fora do filtro de modo: Rushed serve para decidir o que
  // fazer agora, e esconder o que já foi feito apaga o progresso do dia.
  const filteredConcluded = useMemo(() => {
    if (isFutureFilter) return [];
    return applyFilters(concludedTasks);
  }, [isFutureFilter, concludedTasks, applyFilters]);

  // Rushed pode esvaziar a lista legitimamente (nada curto e de alto impacto).
  // Sem aviso, a tela vazia parece falha de carregamento.
  const rushedHidAll = energyMode === 'rushed' && filteredVisible.length === 0 && applyFilters(visibleTasks).length > 0;

  // Enquanto o filtro futuro selecionado ainda busca, evita mostrar vazio.
  const futureLoading = (selectedDateFilter === 'tomorrow' && tomorrowQuery.isLoading) || (selectedDateFilter === 'thisWeek' && week.isLoading);

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleDateFilter = (id: DateFilterId) => {
    setSelectedDateFilter((prev) => (prev === id ? null : id));
  };

  const clearFilters = () => {
    setSelectedAreas([]);
    setSelectedDateFilter(null);
  };

  // Delete otimista: remove do cache na hora e reconcilia com o servidor em
  // background; em erro, restaura o estado anterior.
  const handleDelete = (task: Task) => {
    Alert.alert('Deletar atividade', `Deseja remover "${task.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          const previous = queryClient.getQueryData<TasksData>(tasksKey);
          queryClient.setQueryData<TasksData>(tasksKey, (data) => removeTaskFromLists(data, task.id));
          try {
            await api.delete(`/tasks`, { params: { id: task.id } });
          } catch {
            if (previous) queryClient.setQueryData(tasksKey, previous);
            Alert.alert('Erro', 'Não foi possível deletar a atividade.');
            return;
          } finally {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
          }
        },
      },
    ]);
  };

  // Conclusão/desfazer: o TaskCard já fez a chamada e a animação; aqui movemos a
  // tarefa entre as listas no cache (sem esperar refetch) e revalidamos.
  const handleToggled = useCallback(
    (task: Task, nowConcluded: boolean) => {
      queryClient.setQueryData<TasksData>(tasksKey, (data) => moveTask(data, task.id, nowConcluded));
      queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
    },
    [queryClient, tasksKey],
  );

  const refreshEnergy = useCallback(async () => {
    // `collect()` é assíncrono; sem o await o engine recebe uma Promise e cai
    // no fallback, ignorando os dados reais de saúde do usuário.
    const collected = await getHealthProvider().collect();
    // Sem wearable, o perfil de sono preenche acordar/dormir/duração.
    const metrics = applySleepProfile(collected, sleepProfileRef.current);
    const input = flowlyInputFromMetrics(metrics, 8);
    const result = computeEnergyAtMoment(input, toLocalISOString());
    const engine: EngineEnergy = { score: result.doubleEnergyScore, level: result.doubleEnergyLevel };
    const effective = applyEnergyMode(energyModeRef.current, engine);
    engineRef.current = engine;
    hoursAwakeRef.current = result.components.hoursAwake;
    // Wearable/health real: HRV ou horas de sono vindas do coletor (não só do perfil).
    hasHealthDataRef.current = Boolean(collected.hrvMs != null || collected.sleepHours != null);
    // A coleta roda a cada 60s e devolve um objeto novo mesmo quando nada
    // mudou. Trocar a referência reconstrói a curva e recalcula as sugestões,
    // que é a causa de elas "variarem sozinhas" na tela.
    setEnergyInput((previous) => (energyInputFingerprint(previous) === energyInputFingerprint(input) ? previous : input));
    setLastNightSleepHours(metrics.sleepHours ?? input.lastNightSleepHours ?? null);
    setEngineScore(engine.score);
    setEnergyScore(effective.score);
    setEnergyLevel(effective.level);
    setEnergyReady(true);
    return result;
  }, []);

  // Candidatas determinísticas: são elas que definem o que é acionável. A IA
  // apenas escolhe entre estas e reescreve o texto.
  const coachCandidates = useMemo(() => {
    if (!energyReady) return [] as CoachInsight[];

    const candidates = buildCandidates({
      dateKey,
      now: nowSlot,
      tasks: visibleTasks,
      concluded: concludedTasks,
      curve: buildMobileDayCurve(energyInput, dateKey),
      lastNightSleepHours,
      tomorrowTasks,
      tomorrowCurve: buildMobileDayCurve(energyInput, tomorrowKey),
    });

    return candidates.filter((insight) => !dismissedInsights.includes(insight.id));
  }, [energyReady, energyInput, dateKey, nowSlot, visibleTasks, concludedTasks, lastNightSleepHours, dismissedInsights, tomorrowTasks, tomorrowKey]);

  const aiContext = useMemo(() => ({ energyScore, lastNightSleepHours }), [energyScore, lastNightSleepHours]);
  const rankedInsights = useAiCoachSuggestions(dateKey, coachCandidates, aiContext);
  // Sem IA disponível o hook devolve as candidatas na ordem determinística, então
  // o corte aqui é o mesmo que `buildRecommendations` faria.
  const coachInsights = useMemo(() => rankedInsights.slice(0, MAX_RECOMMENDATIONS), [rankedInsights]);

  // Uma impressão por conjunto de sugestões, para medir aplicação sem inflar o
  // denominador a cada re-render da lista.
  const shownSignature = coachInsights.map((insight) => insight.id).join(',');
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shownSignature || lastShownRef.current === shownSignature) return;

    lastShownRef.current = shownSignature;
    track('coach_suggestion_shown', {
      count: coachInsights.length,
      kinds: coachInsights.map((insight) => insight.id.split('-')[0]).join(','),
      energy_mode: energyMode,
      has_profile: energyInput != null,
    });
  }, [shownSignature, coachInsights, energyMode, energyInput]);

  const dismissInsight = useCallback((insight: CoachInsight) => {
    track('coach_suggestion_dismissed', { kind: insight.id.split('-')[0] ?? 'unknown' });
    setDismissedInsights((previous) => {
      const next = [...previous, insight.id];
      saveDismissedForToday(next).catch(() => undefined);
      return next;
    });
  }, []);

  const handleApplyInsight = useCallback(
    async (insight: CoachInsight) => {
      if (!insight.action || insight.action.type !== 'schedule') return;
      const task = [...visibleTasks, ...concludedTasks, ...allUserTasks].find((item) => item.id === insight.action!.taskId);
      if (!task) {
        Alert.alert('Erro', 'Não encontramos essa atividade.');
        return;
      }

      setApplyingInsightId(insight.id);
      try {
        await syncTaskScheduleToServer(task, insight.action.startISO, insight.action.durationMin);
        track('coach_suggestion_applied', {
          kind: insight.id.split('-')[0] ?? 'unknown',
          duration_min: insight.action.durationMin,
        });
        setDismissedInsights((previous) => {
          const next = [...previous, insight.id];
          saveDismissedForToday(next).catch(() => undefined);
          return next;
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
      } catch {
        Alert.alert('Erro', 'Não foi possível aplicar a sugestão.');
      } finally {
        setApplyingInsightId(null);
      }
    },
    [visibleTasks, concludedTasks, allUserTasks, queryClient],
  );

  const handleSelectEnergyMode = useCallback(
    async (mode: EnergyMode) => {
      // Par (motor, declarado) no instante da escolha — antes de qualquer refresh.
      const engine = engineRef.current;
      const effective = applyEnergyMode(mode, engine);
      const declared = effective.declaredScore ?? engine.score;

      setEnergyMode(mode);
      energyModeRef.current = mode;
      setEnergyModeOpen(false);
      setEnergyScore(effective.score);
      setEnergyLevel(effective.level);
      await saveEnergyModeForToday(mode);

      // Sem coleta concluída não existe score do motor para comparar, e um par
      // (0, declarado) entraria no delta médio como discordância máxima.
      if (energyReady) {
        track('energy_mode_selected', {
          mode,
          engine_score: Math.round(engine.score),
          declared_score: Math.round(declared),
          delta: Math.round(declared - engine.score),
          hours_awake: Math.round(hoursAwakeRef.current),
          has_health_data: hasHealthDataRef.current,
        });
      }

      // Revalida a lista com o novo nível (cache key inclui roundedEnergy).
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
    },
    [energyReady, queryClient],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEnergy();
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
    } catch {
      Alert.alert('Erro', 'Não foi possível recarregar as atividades.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshEnergy, queryClient]);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadEnergyModeForToday().then((mode) => {
      setEnergyMode(mode);
      energyModeRef.current = mode;
    });

    // Sugestões dispensadas hoje: sem isso, "Agora não" só vale até o próximo
    // remount da tela.
    loadDismissedForToday().then(setDismissedInsights);

    // Garante que a Home carregue mesmo se a coleta de energia falhar.
    const runRefresh = () => {
      refreshEnergy().catch(() => setEnergyReady(true));
      // Só avança o slot quando ele realmente virou, para não invalidar o memo
      // das sugestões a cada minuto.
      setNowSlot((previous) => {
        const next = quantizeNow(new Date());
        return next.getTime() === previous.getTime() ? previous : next;
      });
    };

    runRefresh();

    const interval = setInterval(runRefresh, 60_000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        runRefresh();
      }
      appState.current = nextState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshEnergy]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyScore={energyScore} energyMode={energyMode} onLogout={onLogout} onOpenConfig={onOpenConfig} onOpenFilter={() => setFilterOpen(true)} onOpenEnergyMode={() => setEnergyModeOpen(true)} />

      {showTrialBanner ? (
        <Pressable
          onPress={() => setSubscriptionVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Assinar o Flowly Premium"
          className="mt-3 flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80"
          style={{ borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)', backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)' }}
        >
          <Crown size={16} color="#6366f1" />
          <Text className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-200">
            Período de avaliação: {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
          </Text>
          <Text className="text-sm font-semibold" style={{ color: '#6366f1' }}>
            Assinar
          </Text>
        </Pressable>
      ) : null}

      {showLockedBanner ? (
        <Pressable
          onPress={() => setSubscriptionVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Desbloquear recursos Premium"
          className="mt-3 flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80"
          style={{ borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)', backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)' }}
        >
          <Crown size={16} color="#6366f1" />
          <Text className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-200">Calendário, metas e gráficos estão bloqueados</Text>
          <Text className="text-sm font-semibold" style={{ color: '#6366f1' }}>
            Desbloquear
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e4e4e7' : '#3b82f6'} colors={['#3b82f6']} />}
      >
        <View className="mb-3">
          <PeakEnergyCard input={energyInput} currentScore={engineScore} isDark={isDark} />
        </View>

        <CoachSuggestions insights={coachInsights} isDark={isDark} applyingId={applyingInsightId} onApply={handleApplyInsight} onDismiss={dismissInsight} />

        {futureLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
          </View>
        ) : (
          filteredVisible.map((task, index) => (
            <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => handleToggled(task, true)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
          ))
        )}

        {rushedHidAll ? <RushedEmptyState isDark={isDark} onShowAll={() => handleSelectEnergyMode('ideal')} /> : null}

        {isFutureFilter ? null : (
          <View className="w-full border-t border-zinc-200 dark:border-zinc-800" style={Platform.select({ web: { filter: 'grayscale(100%)' }, default: { opacity: 0.5 } })}>
            <Text className="my-2 text-center text-sm text-zinc-400 dark:text-zinc-400">{filteredConcluded.length} atividades já concluídas</Text>

            {filteredConcluded.map((task: Task) => (
              <TaskCard key={task.randomId} highlight={false} task={task} selected isDark={isDark} onComplete={() => handleToggled(task, false)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
            ))}
          </View>
        )}
      </ScrollView>

      <FilterDrawer
        visible={filterOpen}
        isDark={isDark}
        dateFilters={filterDateOptions}
        selectedDateFilter={selectedDateFilter}
        onToggleDateFilter={toggleDateFilter}
        areas={filterAreas}
        selectedAreas={selectedAreas}
        onToggleArea={toggleArea}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
      />

      <NotificationTestModal visible={testModalVisible} isDark={isDark} onClose={() => setTestModalVisible(false)} onShowNow={showNow} onShowIn30Seconds={showIn30Seconds} />

      <ModalScreen visible={subscriptionVisible} onClose={() => setSubscriptionVisible(false)} hideHeader>
        <Subscription source="trial_banner" onClose={() => setSubscriptionVisible(false)} />
      </ModalScreen>

      <EnergyModeSheet visible={energyModeOpen} isDark={isDark} currentMode={energyMode} engineScore={engineScore} onSelect={handleSelectEnergyMode} onClose={() => setEnergyModeOpen(false)} />
    </View>
  );
}
