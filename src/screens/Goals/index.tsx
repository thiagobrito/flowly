import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { api } from '@/lib/network';
import NewGoals from '@/screens/NewGoals';

import EmptyState from './components/EmptyState';
import GoalCard from './components/GoalCard';
import GoalEditor from './components/GoalEditor';
import type { Goal, GoalSetup } from './data';
import { createEmptyGoal, goalSetupToGoals, normalizeGoal } from './data';

type EditorState = { goal: Goal; isNew: boolean } | null;

export default function Goals() {
  const isDark = useColorScheme() === 'dark';
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editor, setEditor] = useState<EditorState>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleCreate = useCallback(() => setEditor({ goal: createEmptyGoal(), isNew: true }), []);
  const handleEdit = useCallback((goal: Goal) => setEditor({ goal, isNew: false }), []);
  const handleCancel = useCallback(() => setEditor(null), []);

  const handleStartSetup = useCallback(() => setSetupMode(true), []);
  const handleSetupComplete = useCallback((setup: GoalSetup) => {
    setGoals(goalSetupToGoals(setup));
    setSetupMode(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function fetchGoals() {
      const response = await api.get<Partial<Goal>[]>('/goals');
      if (Array.isArray(response)) setGoals(response.map(normalizeGoal));
      setLoading(false);
    }
    fetchGoals();
  }, []);

  const handleSave = useCallback((updated: Goal) => {
    setGoals((prev) => {
      const exists = prev.some((goal) => goal.id === updated.id);
      return exists ? prev.map((goal) => (goal.id === updated.id ? updated : goal)) : [...prev, updated];
    });
    setEditor(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    setEditor(null);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }
  if (setupMode) {
    return <NewGoals isDark={isDark} onComplete={handleSetupComplete} onClose={() => setSetupMode(false)} />;
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
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel="Nova meta"
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
