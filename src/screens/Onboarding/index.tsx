import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/network';
import { useOnboarding } from '@/lib/onboarding';
import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';
import type { GoalSetup } from '@/screens/Goals/data';
import NewGoals from '@/screens/NewGoals';
import NewTask from '@/screens/NewTask';
import type { NewTaskPayload } from '@/screens/NewTask/data';
import Subscription from '@/screens/Subscription';

import ActivitiesStep, { type OnboardingActivity } from './components/ActivitiesStep';
import Background from './components/Background';
import CompletedStep from './components/CompletedStep';
import GoalsStep from './components/GoalsStep';
import IntroStep from './components/IntroStep';
import LanguageStep from './components/LanguageStep';
import NotificationsStep from './components/NotificationsStep';
import PaymentStep from './components/PaymentStep';
import ProgressHeader from './components/ProgressHeader';
import QuoteStep from './components/QuoteStep';
import SleepProfileStep from './components/SleepProfileStep';
import type { OnboardingConfig } from './data';
import { DEFAULT_ONBOARDING } from './data';

type OnboardingProps = {
  isDark: boolean;
  /** Chamado ao concluir o onboarding (persiste a flag e navega para a Home). */
  onComplete: () => void;
};

/**
 * Progresso do onboarding persistido em storage: se o app for fechado ou morto
 * no meio do fluxo, o usuário retoma do passo em que parou, sem perder as
 * metas e atividades já criadas. Limpo ao concluir o onboarding.
 */
type OnboardingProgress = PersistedRecord & {
  index: number;
  goalSetup: GoalSetup | null;
  activities: OnboardingActivity[];
  loaded?: boolean;
  lastUpdate?: string;
};

const PROGRESS_KEY = 'onboarding_progress_v1';

const EMPTY_PROGRESS: OnboardingProgress = { index: 0, goalSetup: null, activities: [] };

export default function Onboarding({ isDark, onComplete }: OnboardingProps) {
  const { language, setLanguage } = useOnboarding();
  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_ONBOARDING);
  const [progress, setProgress] = usePersistedState<OnboardingProgress>(EMPTY_PROGRESS, PROGRESS_KEY);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const { index, goalSetup, activities } = progress;

  // Índice do passo anterior, para saber a direção da animação de transição.
  const prevIndexRef = useRef(index);
  useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);

  const goalName = goalSetup?.mainGoal.name?.trim() ? goalSetup.mainGoal.name.trim() : null;

  useEffect(() => {
    let active = true;
    async function fetchConfig() {
      try {
        const remote = await api.get<OnboardingConfig>('/onboarding');
        if (active && remote && Array.isArray(remote.steps) && remote.steps.length > 0) setConfig(remote);
      } catch {
        // mantém o roteiro padrão (mock) quando o backend não responde
      }
    }
    fetchConfig();
    return () => {
      active = false;
    };
  }, []);

  const { steps } = config;
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const goBack = useCallback(() => {
    setProgress({ ...progress, index: Math.max(0, index - 1) });
  }, [setProgress, progress, index]);

  const goNext = useCallback(() => {
    if (isLast) {
      // Fluxo concluído: descarta o progresso salvo para um eventual novo cadastro.
      setProgress({ ...EMPTY_PROGRESS });
      onComplete();
      return;
    }
    setProgress({ ...progress, index: Math.min(steps.length - 1, index + 1) });
  }, [isLast, steps.length, onComplete, setProgress, progress, index]);

  const handlePaywallClose = useCallback(() => {
    setShowPaywall(false);
    goNext();
  }, [goNext]);

  const handleGoalsComplete = useCallback(
    (setup: GoalSetup) => {
      setShowGoals(false);
      setProgress({ ...progress, goalSetup: setup, index: Math.min(steps.length - 1, index + 1) });
    },
    [setProgress, progress, steps.length, index],
  );

  const handleActivityCreated = useCallback(
    (payload: NewTaskPayload) => {
      setProgress({ ...progress, activities: [...activities, { id: `${Date.now()}-${activities.length}`, name: payload.name }] });
    },
    [setProgress, progress, activities],
  );

  // Sempre retorna ao onboarding após criar uma atividade (não navega para fora).
  const handleActivitySuccess = useCallback(() => {
    setShowActivities(false);
  }, []);

  const content = useMemo(() => {
    if (!step) return null;
    switch (step.kind) {
      case 'language':
        return <LanguageStep step={step} isDark={isDark} language={language} onSelect={setLanguage} onNext={goNext} />;
      case 'intro':
        return <IntroStep step={step} isDark={isDark} onNext={goNext} />;
      case 'quote':
        return <QuoteStep step={step} isDark={isDark} onNext={goNext} />;
      case 'goals':
        return <GoalsStep step={step} isDark={isDark} onOpenGoals={() => setShowGoals(true)} onSkip={goNext} />;
      case 'activities':
        return <ActivitiesStep step={step} isDark={isDark} goalName={goalName} activities={activities} onAddActivity={() => setShowActivities(true)} onNext={goNext} />;
      case 'notifications':
        return <NotificationsStep step={step} isDark={isDark} onNext={goNext} />;
      case 'sleepProfile':
        return <SleepProfileStep step={step} isDark={isDark} onNext={goNext} />;
      case 'payment':
        return <PaymentStep step={step} isDark={isDark} onOpenPaywall={() => setShowPaywall(true)} onSkip={goNext} />;
      case 'completed':
        return <CompletedStep step={step} isDark={isDark} onFinish={goNext} />;
      default:
        return null;
    }
  }, [step, isDark, language, setLanguage, goNext, goalName, activities]);

  // Aguarda a hidratação do progresso salvo para não piscar o passo inicial
  // antes de restaurar o ponto em que o usuário parou.
  if (!step || !progress.loaded) return null;

  // Direção da transição: avançar desliza da direita, voltar da esquerda.
  const forward = index >= prevIndexRef.current;
  const entering = (forward ? FadeInRight : FadeInLeft).duration(320);
  const exiting = (forward ? FadeOutLeft : FadeOutRight).duration(200);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ProgressHeader current={index} total={steps.length} isDark={isDark} canGoBack={index > 0} onBack={goBack} />

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        <Animated.View key={step.id} entering={entering} exiting={exiting} className="flex-1">
          {content}
        </Animated.View>
      </ScrollView>

      <Modal visible={showPaywall} animationType="slide" presentationStyle="fullScreen" onRequestClose={handlePaywallClose}>
        <Background isDark={isDark} />
        <Subscription onClose={handlePaywallClose} />
      </Modal>

      <Modal visible={showGoals} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowGoals(false)}>
        <View className="flex-1 bg-white dark:bg-black">
          <Background isDark={isDark} />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View className="flex-1 px-4 pt-2">
              <NewGoals isDark={isDark} onComplete={handleGoalsComplete} onClose={() => setShowGoals(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showActivities} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowActivities(false)}>
        <View className="flex-1 bg-white dark:bg-black">
          <Background isDark={isDark} />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View className="flex-1 px-4 pt-2">
              <View className="h-10 flex-row items-center">
                <Pressable onPress={() => setShowActivities(false)} accessibilityRole="button" accessibilityLabel="Voltar ao onboarding" className="-ml-1 flex-row items-center active:opacity-70">
                  <ChevronLeft size={24} color={isDark ? '#e4e4e7' : '#27272a'} />
                  <Text className="text-base font-medium text-zinc-700 dark:text-zinc-200">Voltar</Text>
                </Pressable>
              </View>
              <NewTask initialArea={goalName} onCreate={handleActivityCreated} onSuccess={handleActivitySuccess} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
