import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import SectionTitle from '../components/SectionTitle';
import ChangeGoalModal from './components/ChangeGoalModal';
import CycleCard from './components/CycleCard';
import FocusCard from './components/FocusCard';
import VisionCard from './components/VisionCard';
import { MOCK_GOALS_DATA } from './data';

type GoalsProps = {
  onBack: () => void;
};

export default function Goals({ onBack }: GoalsProps) {
  const isDark = useColorScheme() === 'dark';
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [vision, setVision] = useState(MOCK_GOALS_DATA.vision);
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(MOCK_GOALS_DATA.vision);

  const data = { ...MOCK_GOALS_DATA, vision };

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

  const handleChangeConfirm = useCallback((reason: string, action: string) => {
    setShowChangeModal(false);
    // TODO: enviar para a API quando o backend estiver disponível
    Alert.alert('Solicitação registrada', `Motivo: ${reason}\nAção: ${action}`);
  }, []);

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
          onPress={() => setShowChangeModal(true)}
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

      <ChangeGoalModal visible={showChangeModal} isDark={isDark} onClose={() => setShowChangeModal(false)} onConfirm={handleChangeConfirm} />
    </View>
  );
}
