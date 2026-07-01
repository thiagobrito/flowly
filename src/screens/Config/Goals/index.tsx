import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import SectionTitle from '../components/SectionTitle';
import CycleCard from './components/CycleCard';
import FocusCard from './components/FocusCard';
import VisionCard from './components/VisionCard';
import { createEmptyGoalsData, fetchGoals, type GoalsData } from './data';
import EditGoals from './EditGoals';

type GoalsProps = {
  onBack: () => void;
};

export default function Goals({ onBack }: GoalsProps) {
  const isDark = useColorScheme() === 'dark';
  const emptyGoals = useMemo(() => createEmptyGoalsData(), []);

  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [vision, setVision] = useState(emptyGoals.vision);
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(emptyGoals.vision);
  const [cycle, setCycle] = useState(emptyGoals.cycle);
  const [mainGoal, setMainGoal] = useState(emptyGoals.mainGoal);
  const [secondaryGoals, setSecondaryGoals] = useState(emptyGoals.secondaryGoals);

  const data: GoalsData = { ...emptyGoals, vision, cycle, mainGoal, secondaryGoals, history: [] };

  const handleEditVision = useCallback(() => {
    setVisionDraft(vision);
    setIsEditingVision(true);
  }, [vision]);

  const handleSaveVision = useCallback(() => {
    const trimmed = visionDraft.trim();
    if (!trimmed) return;

    setVision(trimmed);
    setIsEditingVision(false);
    // TODO: enviar para a API quando o backend estiver disponível
  }, [visionDraft]);

  const handleCancelVision = useCallback(() => {
    setVisionDraft(vision);
    setIsEditingVision(false);
  }, [vision]);

  const handleSaveGoals = useCallback((updated: Pick<GoalsData, 'vision' | 'cycle' | 'mainGoal' | 'secondaryGoals'>) => {
    setVision(updated.vision);
    setVisionDraft(updated.vision);
    setCycle(updated.cycle);
    setMainGoal(updated.mainGoal);
    setSecondaryGoals(updated.secondaryGoals);
    setShowEdit(false);
  }, []);

  useEffect(() => {
    let active = true;

    fetchGoals()
      .then((goals) => {
        if (!active) return;

        setVision(goals.vision);
        setVisionDraft(goals.vision);
        setCycle(goals.cycle);
        setMainGoal(goals.mainGoal);
        setSecondaryGoals(goals.secondaryGoals);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (showEdit) {
    return <EditGoals data={data} onBack={() => setShowEdit(false)} onSave={handleSaveGoals} />;
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center pt-2">
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-80 dark:bg-white/10">
          <ChevronLeft size={22} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>
        <Text className="ml-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Metas & Planejamento</Text>
      </View>
      <Text className="mt-2 px-1 text-sm text-zinc-500 dark:text-zinc-400">Gerencie sua visão de longo prazo e suas metas atuais de 12 semanas.</Text>

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <SectionTitle isDark={isDark}>Visão</SectionTitle>
        <VisionCard vision={isEditingVision ? visionDraft : data.vision} isDark={isDark} isEditing={isEditingVision} onEdit={handleEditVision} onChange={setVisionDraft} onSave={handleSaveVision} onCancel={handleCancelVision} />

        <SectionTitle isDark={isDark}>Ciclo de 12 Semanas</SectionTitle>
        <CycleCard currentWeek={data.cycle.currentWeek} totalWeeks={data.cycle.totalWeeks} mainGoal={data.mainGoal} secondaryGoals={data.secondaryGoals} isDark={isDark} />

        {/*
        <SectionTitle isDark={isDark}>Histórico</SectionTitle>
        <HistoryCard history={data.history} isDark={isDark} />
        */}

        <View className="mt-5">
          <FocusCard isDark={isDark} />
        </View>

        <Pressable
          onPress={() => setShowEdit(true)}
          accessibilityRole="button"
          className="mt-4 flex-row items-center justify-center rounded-2xl border px-4 py-3.5 active:opacity-80"
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
          }}
        >
          <RefreshCw size={16} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          <Text className="ml-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">Mudar Metas</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
