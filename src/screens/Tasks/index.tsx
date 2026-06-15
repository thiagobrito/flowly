import { GoalIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, ScrollView, Text, useColorScheme, View } from 'react-native';

import { toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, flowlyInputFromMetrics, getHealthProvider } from '@/lib/energy';
import { api } from '@/lib/network';

import type { Task } from '../NewTask/data';
import { getLifeArea } from '../NewTask/data';
import type { FilterArea } from './components/FilterDrawer';
import FilterDrawer from './components/FilterDrawer';
import Header from './components/Header';
import TaskCard from './components/TaskCard';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
  onOpenConfig?: () => void;
};

function OrganizeTasks(tasks: any): any {
  return tasks.map((task: any) => ({
    ...task,
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    id: task.id ?? (task as Task & { _id?: string })._id ?? '',
    randomId: Math.random().toString(36).substring(2, 15),
  }));
}

export default function Tasks({ onEdit, onLogout, onOpenConfig }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [updateId, setUpdateId] = useState<any>(0);
  const [loading, setLoading] = useState(true);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);

  const [concludedTasks, setConcludedTasks] = useState<Task[]>([]);
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const filterAreas = useMemo<FilterArea[]>(() => {
    const counts = new Map<string, number>();
    [...visibleTasks, ...concludedTasks].forEach((task) => {
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
  }, [visibleTasks, concludedTasks]);

  const filteredVisible = useMemo(() => (selectedAreas.length === 0 ? visibleTasks : visibleTasks.filter((task) => selectedAreas.includes(task.area))), [visibleTasks, selectedAreas]);

  const filteredConcluded = useMemo(() => (selectedAreas.length === 0 ? concludedTasks : concludedTasks.filter((task) => selectedAreas.includes(task.area))), [concludedTasks, selectedAreas]);

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
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
    const response = await api.get<any>('/tasks', { params: { date: toLocalISOString(), energyLevel } });

    setConcludedTasks(OrganizeTasks(response.concludedTasks));
    setVisibleTasks(OrganizeTasks(response.visibleTasks));

    setLoading(false);
  }, [energyLevel]);

  const refreshEnergy = useCallback(() => {
    const metrics = getHealthProvider().collect() as any;
    const input = flowlyInputFromMetrics(metrics, 8);
    const result = computeEnergyAtMoment(input, toLocalISOString());
    setEnergyScore(result.doubleEnergyScore);
    setEnergyLevel(result.doubleEnergyLevel);
  }, []);

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

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
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

      <FilterDrawer visible={filterOpen} isDark={isDark} areas={filterAreas} selected={selectedAreas} onToggle={toggleArea} onClear={() => setSelectedAreas([])} onClose={() => setFilterOpen(false)} />
    </View>
  );
}
