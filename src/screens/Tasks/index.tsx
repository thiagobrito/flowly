import { GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';

import { toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, flowlyInputFromMetrics, getHealthProvider } from '@/lib/energy';
import { api } from '@/lib/network';

import type { ScheduledSlot, Task } from '../NewTask/data';
import { getLifeArea } from '../NewTask/data';
import type { FilterArea } from './components/FilterDrawer';
import FilterDrawer from './components/FilterDrawer';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import { DATE_FILTERS, type DateFilterId, getWeekDates, taskMatchesDateFilter } from './taskDateFilter';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
  onOpenConfig?: () => void;
};

function OrganizeTasks(tasks: any): Task[] {
  return tasks.map((task: any) => ({
    ...task,
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    id: task.id ?? (task as Task & { _id?: string })._id ?? '',
    randomId: Math.random().toString(36).substring(2, 15),
  }));
}

function mergeSchedules(first?: ScheduledSlot[], second?: ScheduledSlot[]): ScheduledSlot[] {
  const map = new Map<string, ScheduledSlot>();
  for (const slot of [...(first ?? []), ...(second ?? [])]) {
    if (slot?.dateTime) map.set(slot.dateTime, slot);
  }
  return Array.from(map.values());
}

function mergeTasks(existing: Task, incoming: Task): Task {
  return {
    ...existing,
    ...incoming,
    schedule: mergeSchedules(existing.schedule, incoming.schedule),
  };
}

function mergeTaskLists(lists: Task[][]): Task[] {
  const map = new Map<string, Task>();
  for (const list of lists) {
    for (const task of list) {
      if (task.id) {
        const previous = map.get(task.id);
        map.set(task.id, previous ? mergeTasks(previous, task) : task);
      }
    }
  }
  return Array.from(map.values());
}

async function fetchWeekTasks(energyLevel: number): Promise<{ visibleTasks: Task[]; concludedTasks: Task[] }> {
  const weekDates = getWeekDates();
  const results = await Promise.allSettled(
    weekDates.map((date) =>
      api.get<any>('/tasks', {
        params: { date: toLocalISOString(date), energyLevel },
      }),
    ),
  );

  const visibleLists: Task[][] = [];
  const concludedLists: Task[][] = [];
  let successCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successCount += 1;
      visibleLists.push(OrganizeTasks(result.value.visibleTasks));
      concludedLists.push(OrganizeTasks(result.value.concludedTasks));
    }
  }

  if (successCount === 0) {
    throw new Error('Nenhuma requisição de tarefas foi bem-sucedida.');
  }

  const concludedTasks = mergeTaskLists(concludedLists);
  const concludedIds = new Set(concludedTasks.map((task) => task.id));
  const visibleTasks = mergeTaskLists(visibleLists).filter((task) => !concludedIds.has(task.id));

  return { visibleTasks, concludedTasks };
}

export default function Tasks({ onEdit, onLogout, onOpenConfig }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [updateId, setUpdateId] = useState<any>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);

  const [concludedTasks, setConcludedTasks] = useState<Task[]>([]);
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterId | null>(null);

  const allTasks = useMemo(() => [...visibleTasks, ...concludedTasks], [visibleTasks, concludedTasks]);

  const filterDateOptions = useMemo(
    () =>
      DATE_FILTERS.map((filter) => ({
        ...filter,
        count: allTasks.filter((task) => taskMatchesDateFilter(task, filter.id)).length,
      })),
    [allTasks],
  );

  const filterAreas = useMemo<FilterArea[]>(() => {
    const counts = new Map<string, number>();
    allTasks.forEach((task) => {
      counts.set(task.area, (counts.get(task.area) ?? 0) + 1);
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
  }, [allTasks]);

  const applyFilters = useCallback(
    (tasks: Task[]) =>
      tasks.filter((task) => {
        const areaOk = selectedAreas.length === 0 || selectedAreas.includes(task.area);
        const dateOk = !selectedDateFilter || taskMatchesDateFilter(task, selectedDateFilter);
        return areaOk && dateOk;
      }),
    [selectedAreas, selectedDateFilter],
  );

  const filteredVisible = useMemo(() => applyFilters(visibleTasks), [visibleTasks, applyFilters]);
  const filteredConcluded = useMemo(() => applyFilters(concludedTasks), [concludedTasks, applyFilters]);

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

  const handleDelete = (task: Task) => {
    Alert.alert('Deletar atividade', `Deseja remover "${task.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tasks`, { params: { id: task.id } });
            setUpdateId((prev: number) => prev + 1);
          } catch {
            Alert.alert('Erro', 'Não foi possível deletar a atividade.');
          }
        },
      },
    ]);
  };

  const fetchTasks = useCallback(async () => {
    if (!energyLevel) return;

    try {
      const { visibleTasks: nextVisible, concludedTasks: nextConcluded } = await fetchWeekTasks(energyLevel);
      setVisibleTasks(nextVisible);
      setConcludedTasks(nextConcluded);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  }, [energyLevel]);

  const refreshEnergy = useCallback(() => {
    const metrics = getHealthProvider().collect() as any;
    const input = flowlyInputFromMetrics(metrics, 8);
    const result = computeEnergyAtMoment(input, toLocalISOString());
    setEnergyScore(result.doubleEnergyScore);
    setEnergyLevel(result.doubleEnergyLevel);
    return result;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = refreshEnergy();
      const { visibleTasks: nextVisible, concludedTasks: nextConcluded } = await fetchWeekTasks(result.doubleEnergyLevel);
      setVisibleTasks(nextVisible);
      setConcludedTasks(nextConcluded);
    } catch {
      Alert.alert('Erro', 'Não foi possível recarregar as atividades.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshEnergy]);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    refreshEnergy();

    const interval = setInterval(refreshEnergy, 60_000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshEnergy();
      }
      appState.current = nextState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshEnergy]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, updateId]);

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

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e4e4e7' : '#3b82f6'} colors={['#3b82f6']} />}
      >
        {filteredVisible.map((task, index) => (
          <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
        ))}

        <View className="w-full border-t border-zinc-200 dark:border-zinc-800" style={Platform.select({ web: { filter: 'grayscale(100%)' }, default: { opacity: 0.5 } })}>
          <Text className="my-2 text-center text-sm text-zinc-400 dark:text-zinc-400">{filteredConcluded.length} atividades já concluídas</Text>

          {filteredConcluded.map((task: Task) => (
            <TaskCard key={task.randomId} highlight={false} task={task} selected isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
          ))}
        </View>
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
    </View>
  );
}
