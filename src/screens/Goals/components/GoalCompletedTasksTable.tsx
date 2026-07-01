import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Goal } from '../data';
import { aggregateCompletedTasks, fetchTasksForGoal, GOAL_COMPLETED_TASKS_PAGE_SIZE, paginateRows } from '../goalCompletedTasks';

type GoalCompletedTasksTableProps = {
  goal: Goal;
  isDark: boolean;
  accent: string;
};

export default function GoalCompletedTasksTable({ goal, isDark, accent }: GoalCompletedTasksTableProps) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ReturnType<typeof aggregateCompletedTasks>>([]);

  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    let active = true;

    setLoading(true);
    setPage(0);

    fetchTasksForGoal(goal)
      .then((tasks) => {
        if (!active) return;
        setRows(aggregateCompletedTasks(tasks));
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [goal]);

  const { pageRows, totalPages, safePage } = useMemo(() => paginateRows(rows, page, GOAL_COMPLETED_TASKS_PAGE_SIZE), [rows, page]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (loading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }}
    >
      <View className="flex-row border-b px-4 py-2.5" style={{ borderBottomColor: borderColor }}>
        <Text className="w-8 text-xs font-semibold uppercase" style={{ color: mutedColor }}>
          #
        </Text>
        <Text className="flex-1 text-xs font-semibold uppercase" style={{ color: mutedColor }}>
          Tarefa
        </Text>
        <Text className="w-16 text-right text-xs font-semibold uppercase" style={{ color: mutedColor }}>
          Pontos
        </Text>
      </View>

      {pageRows.length === 0 ? (
        <View className="px-4 py-5">
          <Text className="text-center text-sm" style={{ color: mutedColor }}>
            Nenhuma tarefa realizada para esta meta
          </Text>
        </View>
      ) : (
        pageRows.map((row, index) => (
          <View key={row.name} className="flex-row items-center px-4 py-3" style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: borderColor }}>
            <View className="w-8">
              {row.timesDone > 1 ? (
                <Text className="text-sm font-bold" style={{ color: accent }}>
                  {row.timesDone}
                </Text>
              ) : null}
            </View>

            <Text className="flex-1 pr-2 text-sm font-medium text-zinc-900 dark:text-zinc-50" numberOfLines={2}>
              {row.name}
            </Text>

            <Text className="w-16 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">{row.points}</Text>
          </View>
        ))
      )}

      {rows.length > GOAL_COMPLETED_TASKS_PAGE_SIZE ? (
        <View className="flex-row items-center justify-between border-t px-3 py-2" style={{ borderTopColor: borderColor }}>
          <Pressable
            onPress={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            accessibilityRole="button"
            accessibilityLabel="Página anterior"
            className="size-8 items-center justify-center rounded-full active:opacity-60"
            style={{ opacity: safePage === 0 ? 0.35 : 1 }}
          >
            <ChevronLeft size={20} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          </Pressable>

          <Text className="text-xs font-medium" style={{ color: mutedColor }}>
            {safePage + 1} de {totalPages}
          </Text>

          <Pressable
            onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={safePage >= totalPages - 1}
            accessibilityRole="button"
            accessibilityLabel="Próxima página"
            className="size-8 items-center justify-center rounded-full active:opacity-60"
            style={{ opacity: safePage >= totalPages - 1 ? 0.35 : 1 }}
          >
            <ChevronRight size={20} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
