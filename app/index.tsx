import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TabKey } from '@/components/BottomTabBar';
import BottomTabBar from '@/components/BottomTabBar';
import { useSession } from '@/lib/auth';
import Calendar from '@/screens/Calendar';
import Config from '@/screens/Config';
import NewTask from '@/screens/NewTask';
import type { Task } from '@/screens/NewTask/data';
import Statistics from '@/screens/Statistics';
import Tasks from '@/screens/Tasks/index';

type ActiveScreenProps = {
  tab: TabKey;
  onLogout: () => void;
  onTabChange: (tab: TabKey) => void;
  onOpenConfig: () => void;
  editingTask: Task | null;
  onEdit: (task: Task) => void;
  onEditDone: () => void;
};

function ActiveScreen({ tab, onLogout, onTabChange, onOpenConfig, editingTask, onEdit, onEditDone }: ActiveScreenProps) {
  if (tab === 'new') {
    return (
      <NewTask
        task={editingTask}
        onSuccess={() => {
          onEditDone();
          onTabChange('home');
        }}
      />
    );
  }
  if (tab === 'calendar') return <Calendar onEdit={onEdit} />;
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
  const { isHydrated, isAuthenticated, signOut } = useSession();

  const handleTabChange = (next: TabKey) => {
    if (next === 'new') setEditingTask(null);
    setTab(next);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTab('new');
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
            <ActiveScreen tab={tab} onLogout={handleLogout} onTabChange={handleTabChange} onOpenConfig={() => setShowConfig(true)} editingTask={editingTask} onEdit={handleEdit} onEditDone={() => setEditingTask(null)} />
          )}

          {!showConfig ? <BottomTabBar active={tab} onChange={handleTabChange} /> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default Home;
