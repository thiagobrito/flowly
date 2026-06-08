import { useState } from 'react';
import { ScrollView, useColorScheme, View } from 'react-native';

import { useEnergyScore } from '@/lib/energy';

import type { Task } from '../NewTask/data';
import { SAMPLE_TASKS } from '../NewTask/data';
import Header from './components/Header';
import TaskCard from './components/TaskCard';

type TasksProps = {
  tasks?: Task[];
  onSelect?: (task: Task) => void;
};

export default function Tasks({ tasks = SAMPLE_TASKS, onSelect }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const energyInfo = useEnergyScore();

  const handleSelect = (task: Task) => {
    setSelectedId(task.id);
    onSelect?.(task);
  };

  return (
    <View className="flex-1">
      <Header isDark={isDark} energyInfo={energyInfo} />

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={selectedId === task.id}
            isDark={isDark}
            onPress={() => handleSelect(task)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
