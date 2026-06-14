import { ChevronLeft, Plus, Sparkles, Telescope } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';

import { api } from '@/lib/network';

import SectionTitle from '../../components/SectionTitle';
import CycleDatesCard from '../components/CycleDatesCard';
import EditableGoalRow from '../components/EditableGoalRow';
import { CYCLE_WEEKS, type Goal, type GoalsData } from '../data';
import { addWeeks } from '../dateUtils';

type EditGoalsProps = {
  data: GoalsData;
  onBack: () => void;
  onSave: (data: Pick<GoalsData, 'vision' | 'cycle' | 'mainGoal' | 'secondaryGoals'>) => void;
};

const ACCENT = '#6366f1';

export default function EditGoals({ data, onBack, onSave }: EditGoalsProps) {
  const isDark = useColorScheme() === 'dark';

  const [vision, setVision] = useState(data.vision);
  const [startDate, setStartDate] = useState(data.cycle.startDate);
  const [endDate, setEndDate] = useState(data.cycle.endDate);
  const [freeDates, setFreeDates] = useState(data.cycle.endDate !== addWeeks(data.cycle.startDate, CYCLE_WEEKS));
  const [mainGoal, setMainGoal] = useState<Goal>(data.mainGoal);
  const [secondaryGoals, setSecondaryGoals] = useState<Goal[]>(data.secondaryGoals);

  const handleChangeStart = useCallback(
    (iso: string) => {
      setStartDate(iso);
      if (!freeDates) setEndDate(addWeeks(iso, CYCLE_WEEKS));
    },
    [freeDates],
  );

  const handleToggleFreeDates = useCallback(
    (value: boolean) => {
      setFreeDates(value);
      if (!value) setEndDate(addWeeks(startDate, CYCLE_WEEKS));
    },
    [startDate],
  );

  const handleChangeSecondary = useCallback((index: number, goal: Goal) => {
    setSecondaryGoals((prev) => prev.map((item, i) => (i === index ? goal : item)));
  }, []);

  const handleRemoveSecondary = useCallback((index: number) => {
    setSecondaryGoals((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddSecondary = useCallback(() => {
    setSecondaryGoals((prev) => [...prev, { id: `sec-${Date.now()}`, name: '', label: '', description: '', points: 0 }]);
  }, []);

  const canSave = vision.trim().length > 0 && mainGoal.name.trim().length > 0 && secondaryGoals.every((goal) => goal.name.trim().length > 0);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    const payload = {
      vision: vision.trim(),
      cycle: { ...data.cycle, startDate, endDate },
      mainGoal: { ...mainGoal, name: mainGoal.name.trim() },
      secondaryGoals: secondaryGoals.map((goal) => ({ ...goal, name: goal.name.trim() })),
    };

    onSave(payload);

    await api.put(`/goals`, payload);

    // TODO: enviar para a API quando o backend estiver disponível
  }, [canSave, vision, data.cycle, startDate, endDate, mainGoal, secondaryGoals, onSave]);

  return (
    <View className="flex-1">
      <View className="flex-row items-center pt-2">
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-80 dark:bg-white/10">
          <ChevronLeft size={22} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>
        <Text className="ml-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Editar Metas</Text>
      </View>
      <Text className="mt-2 px-1 text-sm text-zinc-500 dark:text-zinc-400">Ajuste o período do ciclo e edite suas metas atuais.</Text>

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <SectionTitle isDark={isDark}>Visão de 1 Ano</SectionTitle>
        <View className="rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.25)', backgroundColor: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.05)' }}>
          <View className="flex-row items-center">
            <View className="size-9 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.12)' }}>
              <Telescope size={18} color="#a855f7" />
            </View>
            <Text className="ml-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Sua visão</Text>
          </View>

          <TextInput
            value={vision}
            onChangeText={setVision}
            multiline
            placeholder="Descreva sua visão para os próximos 12 meses..."
            placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
            className="mt-3 min-h-[88px] rounded-xl border px-3 py-2.5 text-[15px] leading-6 text-zinc-900 dark:text-zinc-50"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
              textAlignVertical: 'top',
            }}
          />

          <View className="mt-3 flex-row">
            <Sparkles size={16} color="#a855f7" style={{ marginTop: 1 }} />
            <Text className="ml-2 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
              Sua visão é o destino de longo prazo. Mantenha todas as metas — principal e secundárias — alinhadas a ela: cada ciclo de 12 semanas deve ser um passo concreto rumo a essa visão. Metas desalinhadas dispersam seu foco e atrasam o que
              realmente importa.
            </Text>
          </View>
        </View>

        <SectionTitle isDark={isDark}>Período do Ciclo</SectionTitle>
        <CycleDatesCard startDate={startDate} endDate={endDate} freeDates={freeDates} isDark={isDark} onChangeStart={handleChangeStart} onChangeEnd={setEndDate} onToggleFreeDates={handleToggleFreeDates} />

        <SectionTitle isDark={isDark}>Meta Principal</SectionTitle>
        <EditableGoalRow goal={mainGoal} isDark={isDark} isMain onChange={setMainGoal} />

        <SectionTitle isDark={isDark}>Metas Secundárias</SectionTitle>
        <View className="gap-3">
          {secondaryGoals.map((goal, index) => (
            <EditableGoalRow key={goal.id} goal={goal} isDark={isDark} onChange={(next) => handleChangeSecondary(index, next)} onRemove={() => handleRemoveSecondary(index)} />
          ))}
        </View>

        <Pressable
          onPress={handleAddSecondary}
          accessibilityRole="button"
          className="mt-3 flex-row items-center justify-center rounded-2xl border px-4 py-3.5 active:opacity-80"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}
        >
          <Plus size={16} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          <Text className="ml-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">Adicionar meta</Text>
        </Pressable>

        <Pressable onPress={handleSave} disabled={!canSave} accessibilityRole="button" className="mt-5 items-center rounded-2xl py-3.5 active:opacity-85" style={{ backgroundColor: ACCENT, opacity: canSave ? 1 : 0.4 }}>
          <Text className="text-base font-semibold text-white">Salvar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
