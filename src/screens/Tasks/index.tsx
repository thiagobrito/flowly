import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, ScrollView, Text, useColorScheme, View } from 'react-native';

import { computeEnergyAtMoment, flowlyInputFromMetrics, getHealthProvider } from '@/lib/energy';
import { api } from '@/lib/network';

import type { Task } from '../NewTask/data';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import { prioritizeTasks } from './priorization';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
};

function OrganizeTasks(tasks: any): any {
  return tasks.map((task: any) => ({
    ...task,
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    id: task.id ?? (task as Task & { _id?: string })._id ?? '',
    randomId: Math.random().toString(36).substring(2, 15),
  }));
}

export default function Tasks({ onEdit, onLogout }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [updateId, setUpdateId] = useState<any>(0);
  const [loading, setLoading] = useState(true);
  const [energyScore, setEnergyScore] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(0);

  const [concludedTasks, setConcludedTasks] = useState<Task[]>([]);
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);

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
    const response = await api.get<any>('/tasks', { params: { date: new Date().toISOString() } });

    setConcludedTasks(OrganizeTasks(response.concludedTasks));
    setVisibleTasks(OrganizeTasks(response.visibleTasks));

    setLoading(false);
  }, []);

  const refreshEnergy = useCallback(() => {
    const metrics = getHealthProvider().collect() as any;
    const input = flowlyInputFromMetrics(metrics, 8);
    const result = computeEnergyAtMoment(input, new Date().toISOString());
    setEnergyScore(result.doubleEnergyScore);
    setEnergyLevel(result.energyLevel);
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

  const prioritizedTasks = useMemo(() => prioritizeTasks(visibleTasks, energyLevel), [visibleTasks, energyLevel]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyScore={energyScore} onLogout={onLogout} />

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
        {prioritizedTasks.map((task, index) => (
          <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
        ))}

        <View className="w-full border-t border-zinc-200 dark:border-zinc-800" style={Platform.select({ web: { filter: 'grayscale(100%)' }, default: { opacity: 0.5 } })}>
          <Text className="my-2 text-center text-sm text-zinc-400 dark:text-zinc-400">{concludedTasks.length} atividades já concluídas</Text>

          {concludedTasks.map((task: Task) => (
            <TaskCard key={task.randomId} highlight={false} task={task} selected isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
