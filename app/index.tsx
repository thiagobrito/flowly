import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TabKey } from '@/components/BottomTabBar';
import BottomTabBar, { PREMIUM_TABS } from '@/components/BottomTabBar';
import VoiceMicButton from '@/components/VoiceMicButton';
import { useSession } from '@/lib/auth';
import { addNotificationResponseListener } from '@/lib/notifications';
import { useOnboarding } from '@/lib/onboarding';
import { usePendingSyncFlush } from '@/lib/pendingSync';
import { useSleepLogSync } from '@/lib/sleepLog';
import { isSleepProfileConfigured, useSleepProfile } from '@/lib/sleepProfile';
import { useSubscription } from '@/lib/subscription';
import { track } from '@/lib/telemetry';
import { ensureWeeklyReviewNotification, WEEKLY_REVIEW_DATA_TYPE } from '@/lib/weeklyReview';
import Calendar from '@/screens/Calendar';
import { onceFrequencyFromISO } from '@/screens/Calendar/scheduleSync';
import Config from '@/screens/Config';
import Goals from '@/screens/Goals';
import NewTask from '@/screens/NewTask';
import type { FrequencyConfig, Task } from '@/screens/NewTask/data';
import Statistics from '@/screens/Statistics';
import PaywallFunnel from '@/screens/Subscription/funnel/PaywallFunnel';
import Tasks from '@/screens/Tasks/index';
import VoiceAssistant, { type VoiceTaskDraft } from '@/screens/VoiceAssistant';
import WeeklyReview from '@/screens/WeeklyReview';

type NewTaskDraft = {
  initialFrequency: FrequencyConfig;
  /** Nome/área pré-preenchidos quando o rascunho vem do assistente de voz. */
  initialName?: string;
  initialArea?: string;
  returnTab: TabKey;
};

type ActiveScreenProps = {
  tab: TabKey;
  onLogout: () => void;
  onOpenConfig: () => void;
  editingTask: Task | null;
  newTaskDraft: NewTaskDraft | null;
  onEdit: (task: Task) => void;
  onCreateAt: (dateTimeISO: string) => void;
  onNewTaskSuccess: () => void;
  autoOpenSleep?: boolean;
  onSleepPromptHandled?: () => void;
  onOpenWeeklyReview?: () => void;
};

function ActiveScreen({ tab, onLogout, onOpenConfig, editingTask, newTaskDraft, onEdit, onCreateAt, onNewTaskSuccess, autoOpenSleep, onSleepPromptHandled, onOpenWeeklyReview }: ActiveScreenProps) {
  if (tab === 'new') {
    return <NewTask task={editingTask} initialName={newTaskDraft?.initialName} initialFrequency={newTaskDraft?.initialFrequency} initialArea={newTaskDraft?.initialArea} onSuccess={onNewTaskSuccess} />;
  }
  if (tab === 'goals') return <Goals />;
  if (tab === 'calendar') return <Calendar onEdit={onEdit} onCreateAt={onCreateAt} />;
  if (tab === 'progress') {
    return <Statistics autoOpenSleep={autoOpenSleep} onSleepPromptHandled={onSleepPromptHandled} onOpenWeeklyReview={onOpenWeeklyReview} />;
  }
  return <Tasks onLogout={onLogout} onEdit={onEdit} onOpenConfig={onOpenConfig} />;
}

function Background({ isDark }: { isDark: boolean }) {
  return <LinearGradient colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}

function Home() {
  const isDark = useColorScheme() === 'dark';
  const [tab, setTab] = useState<TabKey>('home');
  const [showConfig, setShowConfig] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDraft, setNewTaskDraft] = useState<NewTaskDraft | null>(null);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [weeklyReviewVisible, setWeeklyReviewVisible] = useState(false);
  const [weeklyReviewRequested, setWeeklyReviewRequested] = useState(false);
  const [autoOpenSleep, setAutoOpenSleep] = useState(false);
  const sleepPrompted = useRef(false);
  const { isHydrated, isAuthenticated, signOut } = useSession();
  const { isHydrated: onboardingHydrated, completed: onboardingCompleted } = useOnboarding();
  const { profile, isHydrated: sleepHydrated, isReady: sleepReady } = useSleepProfile();

  // Gating premium: o banco decide (trial em curso ou assinatura ativa) e o hook
  // apenas reflete, com cache local para os momentos sem rede.
  const { isReady: subscriptionReady, isPremium } = useSubscription();
  // Funil aberto no gate (ou reaberto ao tocar numa tab bloqueada). Só em
  // memória — reabrir o app recomeça no preço cheio.
  const [paywallOpen, setPaywallOpen] = useState(true);
  // Passo atual do funil, elevado para retomar de onde parou ao reabrir.
  const [funnelStep, setFunnelStep] = useState(0);

  // Reenvia escritas que falharam por rede (metas/atividades do onboarding etc.)
  // assim que houver sessão — na montagem, na hidratação da fila e ao voltar
  // ao foreground.
  usePendingSyncFlush(isAuthenticated);

  // Envia ao servidor o horário de sono medido pelo dispositivo (Apple Health /
  // Health Connect) na abertura do app e a cada retorno ao foreground.
  useSleepLogSync(isAuthenticated);

  // Agenda (ou revalida) a revisão semanal local quando há sessão autenticada.
  useEffect(() => {
    if (!isAuthenticated || !onboardingCompleted) return;
    ensureWeeklyReviewNotification().catch(() => undefined);
  }, [isAuthenticated, onboardingCompleted]);

  // Toque na notificação de revisão semanal. Só registra a intenção: abrir o
  // digest depende do acesso, que pode ainda não ter chegado do servidor quando
  // o app é aberto direto pela notificação.
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === WEEKLY_REVIEW_DATA_TYPE) {
        // Registrado no toque, não na abertura: é a taxa de abertura do push que
        // a Feature 5 promete medir, e ela existe mesmo quando o paywall
        // intercepta o destino.
        track('weekly_review_push_opened');
        setWeeklyReviewRequested(true);
      }
    });
    return () => subscription.remove();
  }, []);

  // Trial expirado e sem assinatura ativa: modo limitado (home + nova atividade).
  // Enquanto não houver resposta do servidor (`isReady`), o app abre normalmente —
  // não trancamos ninguém por falta de informação.
  const isLocked = subscriptionReady && !isPremium;

  const openPaywall = useCallback((reason: string) => {
    track('locked_feature_tapped', { feature: reason });
    setPaywallOpen(true);
  }, []);

  const openWeeklyReview = useCallback((source: 'push' | 'statistics') => {
    track('weekly_review_opened', { source });
    setWeeklyReviewVisible(true);
  }, []);

  // Resolve a intenção da notificação assim que o acesso é conhecido: sem
  // acesso, a revisão semanal é justamente o valor que o paywall vende.
  useEffect(() => {
    if (!weeklyReviewRequested || !subscriptionReady) return;

    setWeeklyReviewRequested(false);
    if (isLocked) {
      openPaywall('weekly_review');
      return;
    }
    openWeeklyReview('push');
  }, [weeklyReviewRequested, subscriptionReady, isLocked, openPaywall, openWeeklyReview]);

  // Sem perfil de sono configurado: leva para Estatísticas e abre o modal do card de Sono.
  useEffect(() => {
    if (!isAuthenticated || !onboardingCompleted || !sleepReady || !subscriptionReady || isLocked) return;
    if (isSleepProfileConfigured(profile)) return;
    if (sleepPrompted.current) return;

    sleepPrompted.current = true;
    setShowConfig(false);
    setTab('progress');
    setAutoOpenSleep(true);
  }, [isAuthenticated, onboardingCompleted, sleepReady, subscriptionReady, isLocked, profile]);

  // Se o usuário ficou numa tab premium e o acesso acabou, volta para a Home.
  useEffect(() => {
    if (!isLocked) return;
    if ((PREMIUM_TABS as readonly string[]).includes(tab)) {
      setTab('home');
    }
  }, [isLocked, tab]);

  const handleTabChange = (next: TabKey) => {
    if (isLocked && (PREMIUM_TABS as readonly string[]).includes(next)) {
      openPaywall(next);
      return;
    }
    if (next === 'new') {
      setEditingTask(null);
      setNewTaskDraft(null);
    }
    setTab(next);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setNewTaskDraft(null);
    setTab('new');
  };

  const handleCreateAt = (dateTimeISO: string) => {
    setEditingTask(null);
    setNewTaskDraft({ initialFrequency: onceFrequencyFromISO(dateTimeISO), returnTab: 'calendar' });
    setTab('new');
  };

  const handleNewTaskSuccess = () => {
    const target = newTaskDraft?.returnTab ?? 'home';
    setEditingTask(null);
    setNewTaskDraft(null);
    // Em modo limitado, não volta para uma tab premium (ex.: calendário).
    setTab(isLocked && (PREMIUM_TABS as readonly string[]).includes(target) ? 'home' : target);
  };

  // Rascunho ditado no assistente de voz → abre o formulário pré-preenchido.
  const handleVoiceEdit = (draft: VoiceTaskDraft) => {
    setVoiceVisible(false);
    setEditingTask(null);
    setNewTaskDraft({ initialName: draft.name, initialFrequency: draft.frequency, initialArea: draft.area, returnTab: 'home' });
    setTab('new');
  };

  const handleVoiceCreated = () => {
    setVoiceVisible(false);
    setTab('home');
  };

  if (!isHydrated || !onboardingHydrated || !sleepHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Background isDark={isDark} />
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#6366f1'} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  // Montado nos dois branches: o gate de paywall faz um `return` antecipado, e
  // deixar o modal só no branch normal transforma o toque na notificação num
  // no-op silencioso.
  const weeklyReview = <WeeklyReview visible={weeklyReviewVisible} onClose={() => setWeeklyReviewVisible(false)} />;

  if (isLocked && paywallOpen) {
    return (
      <View className="flex-1 bg-black">
        <Background isDark />
        <PaywallFunnel
          initialStepIndex={funnelStep}
          onStepChange={setFunnelStep}
          onPurchased={() => {
            setPaywallOpen(false);
            setFunnelStep(0);
          }}
          onExhausted={() => setPaywallOpen(false)}
        />
        {weeklyReview}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Background isDark={isDark} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 px-3 pt-2">
          {showConfig ? (
            <Config onBack={() => setShowConfig(false)} />
          ) : (
            <ActiveScreen
              tab={tab}
              onLogout={handleLogout}
              onOpenConfig={() => setShowConfig(true)}
              editingTask={editingTask}
              newTaskDraft={newTaskDraft}
              onEdit={handleEdit}
              onCreateAt={handleCreateAt}
              onNewTaskSuccess={handleNewTaskSuccess}
              autoOpenSleep={autoOpenSleep}
              onSleepPromptHandled={() => setAutoOpenSleep(false)}
              onOpenWeeklyReview={() => openWeeklyReview('statistics')}
            />
          )}

          {!showConfig ? <VoiceMicButton onActivate={() => (isLocked ? openPaywall('voice') : setVoiceVisible(true))} /> : null}
          {!showConfig ? <BottomTabBar active={tab} onChange={handleTabChange} lockedTabs={isLocked ? PREMIUM_TABS : []} /> : null}
        </View>
      </SafeAreaView>

      <VoiceAssistant visible={voiceVisible} onClose={() => setVoiceVisible(false)} onEdit={handleVoiceEdit} onCreated={handleVoiceCreated} />

      {weeklyReview}
    </View>
  );
}

export default Home;
