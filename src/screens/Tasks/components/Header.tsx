import { Bell, ListChecks, LogOut, SlidersHorizontal, Zap } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { energyScoreToLevel } from '@/lib/energy';

import LevelDots from './LevelDots';

type HeaderProps = {
  isDark: boolean;
  energyScore: number;
  onLogout?: () => void;
  onOpenConfig?: () => void;
  onOpenFilter?: () => void;
  onOpenNotificationTest?: () => void;
};

function BatteryData({ energyScore }: { energyScore: number }) {
  // transforme energyScore para o nivel de energia (0 a 5)
  const energyLevel = energyScoreToLevel(energyScore);

  return (
    <View className="flex flex-col">
      <Text className="text-zinc-900 dark:text-zinc-50">Sua energia corporal</Text>
      <View className="flex flex-row">
        <Zap size={22} color="#22c55e" style={{ marginRight: 6 }} />
        <LevelDots value={energyLevel || 0} accent="#22c55e" isDark={false} big />
      </View>
    </View>
  );
}

export default function Header({ isDark, energyScore, onLogout, onOpenConfig, onOpenFilter, onOpenNotificationTest }: HeaderProps) {
  return (
    <View className="flex-row items-start justify-between pt-2">
      <View className="flex-row items-center">
        <Pressable onPress={onOpenFilter} accessibilityRole="button" accessibilityLabel="Sair" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
          <ListChecks size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>

        <View className="ml-3 flex-col">
          <BatteryData energyScore={energyScore} />
        </View>
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
        {onOpenNotificationTest ? (
          <Pressable onPress={onOpenNotificationTest} accessibilityRole="button" accessibilityLabel="Testar notificação" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
            <Bell size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>
        ) : null}

        <Pressable onPress={onOpenConfig} accessibilityRole="button" accessibilityLabel="Settings" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
          <SlidersHorizontal size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>

        {onLogout ? (
          <Pressable onPress={onLogout} accessibilityRole="button" accessibilityLabel="Sair" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
            <LogOut size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
