import { GoalIcon, HeartPulse, ListChecks, Timer, TrendingUp, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';

import { api } from '@/lib/network';

import { LIFE_AREAS } from '../common';
import { LevelScale, OptionChip, SectionHeader, SubtaskEditor } from './components';
import type { FrequencyConfig, NewTaskPayload, Subtask, Task } from './data';
import { isFrequencyConfigValid } from './data';
import { FrequencyPicker } from './FrequencyPicker';

type NewTaskProps = {
  task?: Task | null;
  onCreate?: (payload: NewTaskPayload) => void;
  onSuccess?: () => void;
};

export default function NewTask({ task, onCreate, onSuccess }: NewTaskProps) {
  const isDark = useColorScheme() === 'dark';
  const isEditing = !!task;

  const [name, setName] = useState(task?.name ?? '');
  const [energy, setEnergy] = useState(task?.energy ?? 3);
  const [impact, setImpact] = useState(task?.impact ?? 3);
  const [frequency, setFrequency] = useState<FrequencyConfig | null>(task?.frequency ?? null);
  const [area, setArea] = useState<string | null>(task?.area ?? null);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [labels, setLabels] = useState<string[]>(['SAÚDE', 'FLOWLY']);

  const canSubmit = useMemo(() => name.trim().length > 0 && isFrequencyConfigValid(frequency) && area !== null, [name, frequency, area]);
  let buttonBackground = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(10, 21, 241, 0.08)';
  let buttonTextColor = isDark ? '#71717a' : '#a1a1aa';

  if (canSubmit) {
    buttonBackground = isDark ? '#fafafa' : '#6366f1';
    buttonTextColor = isDark ? '#18181b' : '#ffffff';
  }

  const handleCreate = async () => {
    if (!isFrequencyConfigValid(frequency) || area === null || name.trim().length === 0) {
      return;
    }

    const payload = {
      name: name.trim(),
      energy,
      impact,
      frequency,
      area,
      subtasks,
    } as any;

    if (isEditing) {
      payload.id = task?.id;
      payload.isEditing = true;
    }

    await api.put(`/tasks`, payload);

    onCreate?.(payload);
    onSuccess?.();
  };

  useEffect(() => {
    const fetchLabels = async () => {
      const goalLabels = await api.get<string[]>(`/goals/labels`);
      setLabels(goalLabels);
    };
    fetchLabels();
  }, []);

  if (labels.length === 0) {
    return <ActivityIndicator />;
  }

  return (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{isEditing ? 'Editar atividade' : 'Nova atividade'}</Text>
      <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Defina o essencial para começar com clareza.</Text>

      <ScrollView className="mt-5 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Meditar 10 minutos"
          placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
          className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-50"
        />

        <View className="mt-6">
          <SectionHeader label="Gasto de Energia" Icon={Zap} accent="#22c55e" />
          <LevelScale value={energy} onChange={setEnergy} Icon={Zap} accent="#22c55e" isDark={isDark} />
        </View>

        <View className="mt-6">
          <SectionHeader label="Impacto esperado" Icon={TrendingUp} accent="#3b82f6" />
          <LevelScale value={impact} onChange={setImpact} Icon={TrendingUp} accent="#3b82f6" isDark={isDark} />
        </View>

        <View className="mt-6">
          <SectionHeader label="Sub-tarefas" Icon={ListChecks} accent="#ec4899" />
          <SubtaskEditor value={subtasks} onChange={setSubtasks} accent="#ec4899" isDark={isDark} />
        </View>

        <View className="mt-6">
          <SectionHeader label="Frequência" Icon={Timer} accent="#f97316" />
          <FrequencyPicker value={frequency} onChange={setFrequency} isDark={isDark} accent="#f97316" />
        </View>

        <View className="mt-6">
          <SectionHeader label="Área da vida ou metas" Icon={HeartPulse} accent="#8b5cf6" />
          <View className="-mx-1 flex-row flex-wrap">
            {labels.map((item) => (
              <View key={item} className="w-1/2 p-1">
                <OptionChip label={item} isGoal Icon={GoalIcon} selected={area === item} accent="#22c55e" isDark={isDark} onPress={() => setArea(item)} className="w-full" />
              </View>
            ))}

            {LIFE_AREAS.map((item) => (
              <View key={item.id} className="w-1/2 p-1">
                <OptionChip label={item.label} Icon={item.Icon} selected={area === item.id} accent={item.accent} isDark={isDark} onPress={() => setArea(item.id)} className="w-full" />
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={handleCreate} disabled={!canSubmit} accessibilityRole="button" accessibilityState={{ disabled: !canSubmit }} className="mb-2 mt-8 active:opacity-80">
          <View className="items-center rounded-2xl py-3.5" style={{ backgroundColor: buttonBackground }}>
            <Text className="text-base font-semibold" style={{ color: buttonTextColor }}>
              {isEditing ? 'Salvar alterações' : 'Criar atividade'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
