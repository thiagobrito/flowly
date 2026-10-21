import { useQueryClient } from '@tanstack/react-query';
import { Crown, GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import LastNightSleepCard from '@/components/LastNightSleepCard';
import ModalScreen from '@/components/ModalScreen';
import PeakEnergyCard from '@/components/PeakEnergyCard';
import { type CoachInsight, loadDismissedForToday, MAX_RECOMMENDATIONS, saveDismissedForToday, sendCoachSuggestionFeedback, useAiCoachSuggestions } from '@/lib/coach';
import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, type FlowlyEngineInput, flowlyInputFromMetrics, getHealthProvider, loadLastEnergyLevel, saveLastEnergyLevel } from '@/lib/energy';
import { applyEnergyMode, type EnergyMode, type EngineEnergy, filterTasksForMode, loadEnergyModeForToday, saveEnergyModeForToday } from '@/lib/energyMode';
import { type HomeData, tasksForDay, useHome, weekTasks } from '@/lib/home';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';
import { useSubscription } from '@/lib/subscription';
import { track } from '@/lib/telemetry';
import { ACCENT, accentOn, useIsDark } from '@/lib/theme';

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
import TaskSection from './components/TaskSection';
import { sortTasksBySchedule } from './sortBySchedule';
import { removeTaskFromHome, toggleTaskOnHome } from './taskCache';
import { DATE_FILTERS, type DateFilterId, getTomorrowDate, taskMatchesDateFilter } from './taskDateFilter';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
  onOpenConfig?: () => void;
};

type TaskListsProps = {
  isDark: boolean;
  futureLoading: boolean;
  isFutureFilter: boolean;
  selectedDateFilter: DateFilterId | null;
  tomorrowDate: Date;
  filteredVisible: Task[];
  filteredOverdue: Task[];
  filteredNodate: Task[];
  onComplete: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function TaskLists({ isDark, futureLoading, isFutureFilter, selectedDateFilter, tomorrowDate, filteredVisible, filteredOverdue, filteredNodate, onComplete, onEdit, onDelete }: TaskListsProps) {
  if (futureLoading) {
    return (
      <View className="items-center justify-center py-10">
        <ActivityIndicator color={isDark ? '#e4e4e7' : ACCENT} />
      </View>
    );
  }

  if (isFutureFilter) {
    return (
      <TaskSection
        isDark={isDark}
        title={selectedDateFilter === 'tomorrow' ? 'Amanhã' : 'Esta semana'}
        tasks={filteredVisible}
        showDate={selectedDateFilter === 'tomorrow'}
        date={tomorrowDate}
        sortLabel="Por horário"
        highlightFirst
        forceShow
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <>
      {selectedDateFilter === 'nodate' ? null : <TaskSection isDark={isDark} title="Hoje" tasks={filteredVisible} showDate sortLabel="Por horário" highlightFirst forceShow onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />}
      <TaskSection isDark={isDark} title="Atrasado" tasks={filteredOverdue} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
      <TaskSection isDark={isDark} title="A definir" tasks={filteredNodate} forceShow={selectedDateFilter === 'nodate'} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
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
  const isDark = useIsDark();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [engineScore, setEngineScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);
  const [energyReady, setEnergyReady] = useState<boolean>(true);
  /** Nível da sessão anterior já lido do disco — libera a primeira requisição. */
  const [energySeeded, setEnergySeeded] = useState(false);
  const [energyMode, setEnergyMode] = useState<EnergyMode>('ideal');
  const [energyModeOpen, setEnergyModeOpen] = useState(false);
  const [energyInput, setEnergyInput] = useState<FlowlyEngineInput | null>(null);
  const [lastNightSleepHours, setLastNightSleepHours] = useState<number | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
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
  const homeKey = useMemo(() => queryKeys.home(dateKey, roundedEnergy), [dateKey, roundedEnergy]);

  // Uma requisição só traz tarefas do dia, da semana, sem data, assinatura,
  // perfil de sono e sugestões do coach.
  const homeQuery = useHome(toLocalISOString(), roundedEnergy, energySeeded);
  const home = homeQuery.data;

  const visibleTasks = useMemo(() => home?.today.visibleTasks ?? [], [home]);
  const concludedTasks = useMemo(() => home?.today.concludedTasks ?? [], [home]);
  const overdueTasks = useMemo(() => home?.overdueTasks ?? [], [home]);
  const nodateTasks = useMemo(() => home?.nodateTasks ?? [], [home]);
  // Spinner só na primeiríssima carga (sem cache) — ao voltar para a Home o
  // conteúdo do cache aparece instantaneamente. `energyReady` não entra aqui: a
  // coleta de saúde é local e só reordena a lista, não deve segurar a tela.
  const loading = !energySeeded || (homeQuery.isLoading && !home);

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

  // O que muda o resultado do motor: os horários usuais e a correção do dia.
  // Serve de gatilho para recalcular quando o perfil chega do disco depois da
  // primeira coleta — sem isso a Home mostra por até um minuto uma curva feita
  // sem a noite do usuário.
  const sleepFingerprint = useMemo(() => {
    const override = sleepProfile.overrides?.[localDateKey()];
    return [sleepProfile.loaded, sleepProfile.usualWakeTime, sleepProfile.usualBedTime, override?.wakeTime, override?.bedTime].join('|');
  }, [sleepProfile]);

  // Trial/assinatura: permite assinar a qualquer momento (dia 0 inclusive).
  // Os dias restantes vêm do banco, via `GET /subscription`.
  const { isPremium, isTrialing, trialDaysLeft } = useSubscription();
  const showTrialBanner = isTrialing;
  const showLockedBanner = !isPremium && !isTrialing;

  const allTasks = useMemo(() => [...visibleTasks, ...overdueTasks, ...nodateTasks, ...concludedTasks], [visibleTasks, overdueTasks, nodateTasks, concludedTasks]);

  // Amanhã/Esta semana produzem uma lista única (sem separar "concluídas", pois
  // conclusão é por dia e dias futuros não têm conclusão).
  const isFutureFilter = selectedDateFilter === 'tomorrow' || selectedDateFilter === 'thisWeek';

  // "Amanhã" e "Esta semana" continuam vindo do servidor (fonte da verdade da
  // recorrência), mas já chegam junto no payload da Home — antes cada um desses
  // filtros disparava de uma a sete requisições extras ao ser aberto.
  const tomorrowDate = useMemo(() => getTomorrowDate(startOfLocalDay(dateKey)), [dateKey]);
  const tomorrowKey = localDateKey(tomorrowDate);
  const tomorrowTasks = useMemo(() => tasksForDay(home?.week, tomorrowKey), [home, tomorrowKey]);
  const allWeekTasks = useMemo(() => weekTasks(home?.week), [home]);

  const matchesArea = useCallback((task: Task) => selectedAreas.length === 0 || selectedAreas.includes(task.goal.name), [selectedAreas]);

  // Todas as contagens vêm dos recortes que o servidor já entregou no payload
  // da Home, inclusive "A definir" — que antes era calculado no cliente sobre a
  // lista completa de tarefas do usuário.
  const filterDateOptions = useMemo(
    () =>
      DATE_FILTERS.map((filter) => {
        let count = 0;
        if (filter.id === 'today') count = visibleTasks.length + concludedTasks.length;
        else if (filter.id === 'tomorrow') count = tomorrowTasks.length;
        else if (filter.id === 'thisWeek') count = allWeekTasks.length;
        else count = nodateTasks.length;
        return { ...filter, count };
      }),
    [visibleTasks.length, concludedTasks.length, tomorrowTasks, allWeekTasks, nodateTasks],
  );

  // As opções de área derivam da fonte do filtro ativo, senão áreas presentes só
  // no dia/semana selecionados não apareceriam para filtrar.
  const filterAreas = useMemo<FilterArea[]>(() => {
    let source = allTasks;
    if (selectedDateFilter === 'tomorrow') source = tomorrowTasks;
    else if (selectedDateFilter === 'thisWeek') source = allWeekTasks;
    else if (selectedDateFilter === 'nodate') source = nodateTasks;
    else if (selectedDateFilter === 'today') source = [...visibleTasks, ...concludedTasks];

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
  }, [selectedDateFilter, tomorrowTasks, allWeekTasks, nodateTasks, visibleTasks, concludedTasks, allTasks]);

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
    else if (selectedDateFilter === 'thisWeek') list = allWeekTasks.filter(matchesArea);
    else if (selectedDateFilter === 'nodate') list = [];
    else list = applyFilters(visibleTasks);
    return sortTasksBySchedule(filterTasksForMode(list, energyMode), dateKey);
  }, [selectedDateFilter, tomorrowTasks, allWeekTasks, matchesArea, visibleTasks, applyFilters, energyMode, dateKey]);

  const filteredOverdue = useMemo(() => {
    if (selectedDateFilter) return [];
    return sortTasksBySchedule(filterTasksForMode(overdueTasks.filter(matchesArea), energyMode), dateKey);
  }, [selectedDateFilter, overdueTasks, matchesArea, energyMode, dateKey]);

  const filteredNodate = useMemo(() => {
    if (selectedDateFilter && selectedDateFilter !== 'nodate') return [];
    return sortTasksBySchedule(filterTasksForMode(nodateTasks.filter(matchesArea), energyMode), dateKey);
  }, [selectedDateFilter, nodateTasks, matchesArea, energyMode, dateKey]);

  // Concluídas ficam fora do filtro de modo: Rushed serve para decidir o que
  // fazer agora, e esconder o que já foi feito apaga o progresso do dia.
  const filteredConcluded = useMemo(() => {
    if (isFutureFilter) return [];
    return applyFilters(concludedTasks);
  }, [isFutureFilter, concludedTasks, applyFilters]);

  // Rushed pode esvaziar a lista legitimamente (nada curto e de alto impacto).
  // Sem aviso, a tela vazia parece falha de carregamento.
  const rushedHidAll =
    energyMode === 'rushed' &&
    filteredVisible.length === 0 &&
    filteredOverdue.length === 0 &&
    filteredNodate.length === 0 &&
    (applyFilters(visibleTasks).length > 0 || overdueTasks.filter(matchesArea).length > 0 || nodateTasks.filter(matchesArea).length > 0);

  // Enquanto o payload da Home ainda busca, evita mostrar o filtro futuro vazio.
  const futureLoading = isFutureFilter && homeQuery.isLoading;

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
          const previous = queryClient.getQueryData<HomeData>(homeKey);
          queryClient.setQueryData<HomeData>(homeKey, (data) => removeTaskFromHome(data, task.id));
          try {
            await api.delete(`/tasks`, { params: { id: task.id } });
          } catch {
            if (previous) queryClient.setQueryData(homeKey, previous);
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
      queryClient.setQueryData<HomeData>(homeKey, (data) => toggleTaskOnHome(data, task.id, nowConcluded, dateKey));
      queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
    },
    [queryClient, homeKey, dateKey],
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
    // Semente da próxima abertura: sem ela a primeira requisição sai com nível 0
    // e precisa ser refeita quando a coleta real chega.
    saveLastEnergyLevel(effective.level).catch(() => undefined);
    return result;
  }, []);

  // Agenda e candidatas vêm do servidor; o app só manda contexto de energia.
  const aiContext = useMemo(() => ({ energyScore, lastNightSleepHours }), [energyScore, lastNightSleepHours]);
  // A Home já traz as sugestões do dia quando existem. Só chamamos o endpoint
  // de geração quando ela voltou sem nada — é lá que a agenda é recalculada.
  const coachQueryEnabled = energyReady && Boolean(home) && !home?.coach;
  const { insights: rankedInsights, isPending: coachPending, batchId: coachBatchId } = useAiCoachSuggestions(dateKey, aiContext, coachQueryEnabled, home?.coach ?? null);

  // Resposta do servidor, cortada e sem ids já aplicados/dispensados no dia.
  const coachInsights = useMemo(() => rankedInsights.filter((insight) => !dismissedInsights.includes(insight.id)).slice(0, MAX_RECOMMENDATIONS), [rankedInsights, dismissedInsights]);

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

  const dismissInsight = useCallback(
    (insight: CoachInsight) => {
      track('coach_suggestion_dismissed', { kind: insight.id.split('-')[0] ?? 'unknown' });
      sendCoachSuggestionFeedback({ dateKey, suggestionId: insight.id, status: 'dismissed', batchId: coachBatchId });
      setDismissedInsights((previous) => {
        const next = [...previous, insight.id];
        saveDismissedForToday(next).catch(() => undefined);
        return next;
      });
    },
    [dateKey, coachBatchId],
  );

  const handleApplyInsight = useCallback(
    async (insight: CoachInsight) => {
      if (!insight.action || insight.action.type !== 'schedule') return;
      // As candidatas do coach saem das tarefas do dia, mas a semana e as sem
      // data entram na busca para cobrir sugestões de reagendamento.
      const task = [...visibleTasks, ...concludedTasks, ...overdueTasks, ...allWeekTasks, ...nodateTasks].find((item) => item.id === insight.action!.taskId);
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
        sendCoachSuggestionFeedback({ dateKey, suggestionId: insight.id, status: 'applied', batchId: coachBatchId });
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
    [visibleTasks, concludedTasks, overdueTasks, allWeekTasks, nodateTasks, queryClient, dateKey, coachBatchId],
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

    // O nível de energia entra na chave da requisição. Recuperá-lo do disco
    // antes do primeiro fetch (leitura local, poucos milissegundos) evita pedir
    // a lista com nível 0 e ter que refazer a requisição quando a coleta de
    // saúde termina.
    loadLastEnergyLevel()
      .then((level) => {
        if (level != null) setEnergyLevel(level);
      })
      .finally(() => setEnergySeeded(true));

    // Garante que a Home carregue mesmo se a coleta de energia falhar.
    const runRefresh = () => {
      refreshEnergy().catch(() => setEnergyReady(true));
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

  // Perfil de sono hidratado (ou editado em Estatísticas) depois da primeira
  // coleta: recalcula na hora em vez de esperar o próximo tick de 60s.
  useEffect(() => {
    refreshEnergy().catch(() => undefined);
  }, [sleepFingerprint, refreshEnergy]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : ACCENT} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyMode={energyMode} onLogout={onLogout} onOpenConfig={onOpenConfig} onOpenFilter={() => setFilterOpen(true)} onOpenEnergyMode={() => setEnergyModeOpen(true)} />

      {showTrialBanner ? (
        <Pressable
          onPress={() => setSubscriptionVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Assinar o Flowly Premium"
          className="mt-3 flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80"
          style={{ borderColor: `${ACCENT}${isDark ? '59' : '40'}`, backgroundColor: `${ACCENT}${isDark ? '1f' : '14'}` }}
        >
          <Crown size={16} color={accentOn(isDark)} />
          <Text className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-200">
            Período de avaliação: {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
          </Text>
          <Text className="text-sm font-semibold" style={{ color: accentOn(isDark) }}>
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
          style={{ borderColor: `${ACCENT}${isDark ? '59' : '40'}`, backgroundColor: `${ACCENT}${isDark ? '1f' : '14'}` }}
        >
          <Crown size={16} color={accentOn(isDark)} />
          <Text className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-200">Calendário, metas e gráficos estão bloqueados</Text>
          <Text className="text-sm font-semibold" style={{ color: accentOn(isDark) }}>
            Desbloquear
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e4e4e7' : ACCENT} colors={[ACCENT]} />}
      >
        <View className="mb-4" style={{ gap: 10 }}>
          <PeakEnergyCard input={energyInput} currentScore={engineScore} isDark={isDark} collapsible />
          <LastNightSleepCard input={energyInput} isDark={isDark} />
        </View>

        <CoachSuggestions insights={coachInsights} loading={coachQueryEnabled && coachPending} isDark={isDark} applyingId={applyingInsightId} onApply={handleApplyInsight} onDismiss={dismissInsight} />

        <TaskLists
          isDark={isDark}
          futureLoading={futureLoading}
          isFutureFilter={isFutureFilter}
          selectedDateFilter={selectedDateFilter}
          tomorrowDate={tomorrowDate}
          filteredVisible={filteredVisible}
          filteredOverdue={filteredOverdue}
          filteredNodate={filteredNodate}
          onComplete={(task) => handleToggled(task, true)}
          onEdit={onEdit}
          onDelete={handleDelete}
        />

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
