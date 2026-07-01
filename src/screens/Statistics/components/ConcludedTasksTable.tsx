import { Check, TrendingUp, Zap } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { Task } from '../../NewTask/data';
import { getLifeArea } from '../../NewTask/data';

type ConcludedTasksTableProps = {
  tasks: Task[];
  isDark: boolean;
};

export default function ConcludedTasksTable({ tasks, isDark }: ConcludedTasksTableProps) {
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <View>
      <View className="overflow-hidden rounded-2xl bg-white p-2">
        <View className="flex-row items-center gap-2.5 px-3 py-2">
          <View className="size-9 items-center justify-center rounded-full bg-green-500/15">
            <Check size={18} color="#3b82f6" />
          </View>
          <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Tarefas Concluídas</Text>
        </View>

        <View className="flex-row border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-700/50">
          <Text className="flex-1 text-xs font-semibold uppercase" style={{ color: mutedColor }}>
            Tarefa
          </Text>
          <Text className="w-24 text-xs font-semibold uppercase" style={{ color: mutedColor }}>
            Área
          </Text>
          <Text className="w-10 text-center text-xs font-semibold uppercase" style={{ color: mutedColor }}>
            En.
          </Text>
          <Text className="w-10 text-center text-xs font-semibold uppercase" style={{ color: mutedColor }}>
            Im.
          </Text>
        </View>

        {tasks.length === 0 ? (
          <View className="p-4">
            <Text className="text-center text-sm" style={{ color: mutedColor }}>
              Nenhuma tarefa concluída
            </Text>
          </View>
        ) : (
          tasks.map((task, index) => {
            const area = getLifeArea(task.goal.name);
            const accent = area?.accent ?? '#71717a';

            return (
              <View key={task.id || task.randomId || String(index)} className="flex-row items-center px-4 py-3" style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                <Text className="flex-1 pr-2 text-sm font-medium text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
                  {task.name}
                </Text>

                <View className="w-24 pr-2">
                  <View className="self-start rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}22` }}>
                    <Text className="text-xs font-semibold" style={{ color: accent }} numberOfLines={1}>
                      {area?.label ?? task.goal.name}
                    </Text>
                  </View>
                </View>

                <View className="w-10 flex-row items-center justify-center">
                  <Zap size={12} color="#22c55e" style={{ marginRight: 3 }} />
                  <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{task.energy ?? 0}</Text>
                </View>

                <View className="w-10 flex-row items-center justify-center">
                  <TrendingUp size={12} color="#3b82f6" style={{ marginRight: 3 }} />
                  <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{task.impact ?? 0}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
