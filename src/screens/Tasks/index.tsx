import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';

import { localDateKey, toLocalISOString } from '@/lib/date';
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
import { DATE_FILTERS, type DateFilterId, taskMatchesDateFilter } from './taskDateFilter';

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

// Todas as tarefas do usuário (sem filtro de dia). Necessário para os filtros
// Amanhã/Esta semana alcançarem tarefas que não estão previstas para hoje.
async function fetchAllTasks(): Promise<Task[]> {
  const results = await api.get<any>('/tasks', { params: { scope: 'all' } });
  return OrganizeTasks(results.tasks ?? []);
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

  // Amanhã/Esta semana buscam tarefas fora do dia de hoje: a fonte passa a ser a
  // lista completa do usuário.
  const isFutureFilter = selectedDateFilter === 'tomorrow' || selectedDateFilter === 'thisWeek';

  // Contagens dos filtros de data usam TODAS as tarefas do usuário, para que
  // Amanhã/Esta semana reflitam também tarefas que não estão previstas para hoje.
  const filterDateOptions = useMemo(
    () =>
      DATE_FILTERS.map((filter) => ({
        ...filter,
        count: allUserTasks.filter((task) => taskMatchesDateFilter(task, filter.id)).length,
      })),
    [allUserTasks],
  );

  // Com um filtro futuro ativo, a lista vem de `allUserTasks`; as opções de área
  // devem refletir a mesma fonte, senão áreas presentes só em dias futuros não
  // apareceriam para filtrar.
  const filterAreas = useMemo<FilterArea[]>(() => {
    const source = isFutureFilter ? allUserTasks : allTasks;
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
  }, [isFutureFilter, allUserTasks, allTasks]);

  const applyFilters = useCallback(
    (tasks: Task[]) =>
      tasks.filter((task) => {
        const areaOk = selectedAreas.length === 0 || selectedAreas.includes(task.goal.name);
        const dateOk = !selectedDateFilter || taskMatchesDateFilter(task, selectedDateFilter);
        return areaOk && dateOk;
      }),
    [selectedAreas, selectedDateFilter],
  );

  // Amanhã/Esta semana produzem uma lista única (sem separar "concluídas", pois
  // conclusão é por dia e dias futuros não têm conclusão).
  const filteredVisible = useMemo(() => {
    if (isFutureFilter && selectedDateFilter) {
      return allUserTasks.filter((task) => {
        const areaOk = selectedAreas.length === 0 || selectedAreas.includes(task.goal.name);
        return areaOk && taskMatchesDateFilter(task, selectedDateFilter);
      });
    }
    return applyFilters(visibleTasks);
  }, [isFutureFilter, selectedDateFilter, allUserTasks, selectedAreas, visibleTasks, applyFilters]);

  const filteredConcluded = useMemo(() => (isFutureFilter ? [] : applyFilters(concludedTasks)), [isFutureFilter, concludedTasks, applyFilters]);

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
        {filteredVisible.map((task, index) => (
          <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => handleToggled(task, true)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
        ))}

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
