import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, useColorScheme, View } from 'react-native';

import { useEnergyScore } from '@/lib/energy';
import { api } from '@/lib/network';

import type { Task } from '../NewTask/data';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import FilterTasksToShow from './filter';
import { prioritizeTasks } from './priorization';

type TasksProps = {
  onEdit?: (task: Task) => void;
  onLogout?: () => void;
};

export default function Tasks({ onEdit, onLogout }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const energyInfo = useEnergyScore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updateId, setUpdateId] = useState<any>(0);

  const handleDelete = (task: Task) => {
    Alert.alert('Deletar atividade', `Deseja remover "${task.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tasks/${task.id}`);
            setUpdateId((prev: number) => prev + 1);
          } catch {
            Alert.alert('Erro', 'Não foi possível deletar a atividade.');
          }
        },
      },
    ]);
  };

  const fetchTasks = useCallback(async () => {
    const response = await api.get<{ result: Task[] }>('/tasks');
    const taskList = response.result.map((task) => ({
      ...task,
      // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
      id: task.id ?? (task as Task & { _id?: string })._id ?? '',
      randomId: Math.random().toString(36).substring(2, 15),
    }));
    setTasks(taskList);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, updateId]);

  // `useEnergyScore` retorna 0-100; o FlowScore espera energia atual em 0-5.
  const currentEnergy = (energyInfo.score ?? 0) / 20;

  const { concludedTasks, visibleTasks } = useMemo(() => FilterTasksToShow(tasks), [tasks]);
  const prioritizedTasks = useMemo(() => prioritizeTasks(visibleTasks, currentEnergy), [visibleTasks, currentEnergy]);

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyInfo={energyInfo} onLogout={onLogout} />

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
        {prioritizedTasks.map((task, index) => (
          <TaskCard key={task.randomId} highlight={index === 0} task={task} selected={false} isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
        ))}

        <View
          className="w-full border-t border-zinc-200 dark:border-zinc-800"
          style={Platform.select({
            web: { filter: 'grayscale(100%)' },
            default: { opacity: 0.5 },
          })}
        >
          <Text className="my-2 text-center text-sm text-zinc-400 dark:text-zinc-400">{concludedTasks.length} atividades já concluídas</Text>

          {concludedTasks.map((task: Task) => (
            <TaskCard key={task.randomId} highlight={false} task={task} selected isDark={isDark} onComplete={() => setUpdateId(updateId + 1)} onEdit={() => onEdit?.(task)} onDelete={() => handleDelete(task)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
