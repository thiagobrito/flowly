import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TabKey } from '@/components/BottomTabBar';
import BottomTabBar from '@/components/BottomTabBar';
import { useSession } from '@/lib/auth';
import { useSubscription } from '@/lib/subscription';
import Calendar from '@/screens/Calendar';
import { onceFrequencyFromISO } from '@/screens/Calendar/scheduleSync';
import Config from '@/screens/Config';
import Goals from '@/screens/Goals';
import NewTask from '@/screens/NewTask';
import type { FrequencyConfig, Task } from '@/screens/NewTask/data';
import Paywall from '@/screens/Paywall';
import Statistics from '@/screens/Statistics';
import Tasks from '@/screens/Tasks/index';

type NewTaskDraft = {
  initialFrequency: FrequencyConfig;
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
};

function ActiveScreen({ tab, onLogout, onOpenConfig, editingTask, newTaskDraft, onEdit, onCreateAt, onNewTaskSuccess }: ActiveScreenProps) {
  if (tab === 'new') {
    return <NewTask task={editingTask} initialFrequency={newTaskDraft?.initialFrequency} onSuccess={onNewTaskSuccess} />;
  }
  if (tab === 'goals') return <Goals />;
  if (tab === 'calendar') return <Calendar onEdit={onEdit} onCreateAt={onCreateAt} />;
  if (tab === 'progress') return <Statistics />;
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
  const { isHydrated, isAuthenticated, signOut } = useSession();
  const { isReady: subscriptionReady, isPremium, refresh: refreshSubscription } = useSubscription();

  const handleTabChange = (next: TabKey) => {
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
    setTab(target);
  };

  if (!isHydrated) {
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

  if (!subscriptionReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Background isDark={isDark} />
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#6366f1'} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-black">
        <Background isDark={isDark} />
        <Paywall onClose={refreshSubscription} />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Background isDark={isDark} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 px-3 pt-2">
          {showConfig ? (
            <Config onBack={() => setShowConfig(false)} />
          ) : (
            <ActiveScreen tab={tab} onLogout={handleLogout} onOpenConfig={() => setShowConfig(true)} editingTask={editingTask} newTaskDraft={newTaskDraft} onEdit={handleEdit} onCreateAt={handleCreateAt} onNewTaskSuccess={handleNewTaskSuccess} />
          )}

          {!showConfig ? <BottomTabBar active={tab} onChange={handleTabChange} /> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default Home;
