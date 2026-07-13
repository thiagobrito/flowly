import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';

import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, flowlyInputFromMetrics, getHealthProvider } from '@/lib/energy';
import { useFeatureFlags } from '@/lib/featureFlags';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';
import { useLocalTrial, useSubscription } from '@/lib/subscription';

import { useNotificationTest } from '../Config/hooks/useNotificationTest';
import NotificationTestModal from '../Config/NotificationTestModal';
import type { Task } from '../NewTask/data';
import { getLifeArea } from '../NewTask/data';
import Subscription from '../Subscription';
import type { FilterArea } from './components/FilterDrawer';
import FilterDrawer from './components/FilterDrawer';
import Header from './components/Header';
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

export default function Tasks({ onEdit, onLogout, onOpenConfig }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);
  const [energyReady, setEnergyReady] = useState<boolean>(false);

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
  const { trialDays } = useFeatureFlags();
  const { isPremium } = useSubscription();
  const { isActive: trialActive, daysLeft: trialDaysLeft } = useLocalTrial(trialDays);
  const showTrialBanner = !isPremium && trialActive;

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
  const wantTomorrow = filterOpen || selectedDateFilter === 'tomorrow';

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
    if (selectedDateFilter === 'tomorrow') return tomorrowTasks.filter(matchesArea);
    if (selectedDateFilter === 'thisWeek') return week.tasks.filter(matchesArea);
    if (selectedDateFilter === 'nodate') return allUserTasks.filter((task) => taskMatchesDateFilter(task, 'nodate') && matchesArea(task));
    return applyFilters(visibleTasks);
  }, [selectedDateFilter, tomorrowTasks, week.tasks, allUserTasks, matchesArea, visibleTasks, applyFilters]);

  const filteredConcluded = useMemo(() => (isFutureFilter ? [] : applyFilters(concludedTasks)), [isFutureFilter, concludedTasks, applyFilters]);

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
    setEnergyScore(result.doubleEnergyScore);
    setEnergyLevel(result.doubleEnergyLevel);
    setEnergyReady(true);
    return result;
  }, []);

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyScore={energyScore} onLogout={onLogout} onOpenConfig={onOpenConfig} onOpenFilter={() => setFilterOpen(true)} />

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

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e4e4e7' : '#3b82f6'} colors={['#3b82f6']} />}
      >
        {futureLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
          </View>
        ) : (
          filteredVisible.map((task, index) => (
            <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => handleToggled(task, true)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
          ))
        )}

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

      <Modal visible={subscriptionVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSubscriptionVisible(false)}>
        <Subscription onClose={() => setSubscriptionVisible(false)} />
      </Modal>
    </View>
  );
}
