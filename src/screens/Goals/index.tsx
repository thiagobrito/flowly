import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import NewGoals from '@/screens/NewGoals';

import EmptyState from './components/EmptyState';
import GoalCard from './components/GoalCard';
import GoalEditor from './components/GoalEditor';
import type { Goal, GoalSetup } from './data';
import { goalSetupToGoals, normalizeGoal, secondarySetupToGoal } from './data';

async function fetchGoals(): Promise<Goal[]> {
  const response = await api.get<Partial<Goal>[]>('/goals');
  return Array.isArray(response) ? response.map(normalizeGoal) : [];
}

type EditorState = { goal: Goal; isNew: boolean } | null;

export default function Goals() {
  const isDark = useColorScheme() === 'dark';
  const queryClient = useQueryClient();
  const goalsQuery = useQuery<Goal[]>({ queryKey: queryKeys.goals(), queryFn: fetchGoals });
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const [editor, setEditor] = useState<EditorState>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [addSecondaryMode, setAddSecondaryMode] = useState(false);

  const setGoalsCache = useCallback(
    (updater: (prev: Goal[]) => Goal[]) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals(), (prev) => updater(prev ?? []));
    },
    [queryClient],
  );

  const handleAddSecondary = useCallback(() => setAddSecondaryMode(true), []);
  const handleEdit = useCallback((goal: Goal) => setEditor({ goal, isNew: false }), []);
  const handleCancel = useCallback(() => setEditor(null), []);

  const handleStartSetup = useCallback(() => setSetupMode(true), []);
  const handleSetupComplete = useCallback(
    (setup: GoalSetup) => {
      // Exibe imediatamente as metas recém-criadas (já persistidas pela anamnese)
      // e revalida em background para trazer os campos calculados do servidor.
      setGoalsCache(() => goalSetupToGoals(setup));
      queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
      setSetupMode(false);
    },
    [setGoalsCache, queryClient],
  );

  const handleAddSecondaryComplete = useCallback(
    (setup: GoalSetup) => {
      const primary = goals.find((goal) => goal.type === 'primary');
      const secondary = setup.secondaryGoals[0];
      if (!primary || !secondary) {
        setAddSecondaryMode(false);
        return;
      }

      setGoalsCache((prev) => [...prev, secondarySetupToGoal(secondary, primary)]);
      queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
      setAddSecondaryMode(false);
    },
    [goals, setGoalsCache, queryClient],
  );

  const handleSave = useCallback(
    (updated: Goal) => {
      setGoalsCache((prev) => {
        const exists = prev.some((goal) => goal.id === updated.id);
        return exists ? prev.map((goal) => (goal.id === updated.id ? updated : goal)) : [...prev, updated];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
      setEditor(null);
    },
    [setGoalsCache, queryClient],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setGoalsCache((prev) => prev.filter((goal) => goal.id !== id));
      queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
      setEditor(null);
    },
    [setGoalsCache, queryClient],
  );

  if (goalsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }
  if (setupMode) {
    return <NewGoals isDark={isDark} onComplete={handleSetupComplete} onClose={() => setSetupMode(false)} />;
  }

  if (addSecondaryMode) {
    return <NewGoals mode="addSecondary" existingGoals={goals} isDark={isDark} onComplete={handleAddSecondaryComplete} onClose={() => setAddSecondaryMode(false)} />;
  }

  if (editor) {
    return <GoalEditor goal={editor.goal} isNew={editor.isNew} isDark={isDark} onCancel={handleCancel} onSave={handleSave} onDelete={editor.isNew ? undefined : () => handleDelete(editor.goal.id)} />;
  }

  if (goals.length === 0) {
    return (
      <View className="flex-1">
        <EmptyState isDark={isDark} onCreate={handleStartSetup} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-start justify-between pt-2">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Metas</Text>
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Seu centro de comando: transforme visão em progresso visível.</Text>
        </View>
        <Pressable
          onPress={handleAddSecondary}
          accessibilityRole="button"
          accessibilityLabel="Adicionar meta secundária"
          className="size-11 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)' }}
        >
          <Plus size={22} color="#3b82f6" strokeWidth={2.6} />
        </Pressable>
      </View>

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110, gap: 16 }}>
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} isDark={isDark} onEdit={() => handleEdit(goal)} />
        ))}
      </ScrollView>
    </View>
  );
}
