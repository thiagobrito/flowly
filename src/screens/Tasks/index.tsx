import { useEffect, useState } from 'react';
import { ScrollView, useColorScheme, View } from 'react-native';

import { useEnergyScore } from '@/lib/energy';
import { api } from '@/lib/network';

import type { Task } from '../NewTask/data';
import Header from './components/Header';
import TaskCard from './components/TaskCard';

type TasksProps = {
  onSelect?: (task: Task) => void;
  onLogout?: () => void;
};

export default function Tasks({ onSelect, onLogout }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const energyInfo = useEnergyScore();
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleSelect = (task: Task) => {
    setSelectedId(task.id);
    onSelect?.(task);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      const response = await api.get<{ result: Task[] }>('/tasks');
      setTasks(
        response.result.map((task) => ({
          ...task,
          // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
          id: task.id ?? (task as Task & { _id?: string })._id ?? '',
        })),
      );
    };
    fetchTasks();
  }, []);

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyInfo={energyInfo} onLogout={onLogout} />

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} selected={selectedId === task.id} isDark={isDark} onPress={() => handleSelect(task)} />
        ))}
      </ScrollView>
    </View>
  );
}
