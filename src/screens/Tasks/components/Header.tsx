import { ListChecks, LogOut, SlidersHorizontal, Zap } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { energyScoreToLevel } from '@/lib/energy';
import type { EnergyMode } from '@/lib/energyMode';
import { ACCENT, ENERGY } from '@/lib/theme';

import LevelDots from './LevelDots';

type HeaderProps = {
  isDark: boolean;
  energyScore: number;
  energyMode?: EnergyMode;
  onLogout?: () => void;
  onOpenConfig?: () => void;
  onOpenFilter?: () => void;
  onOpenEnergyMode?: () => void;
};

const MODE_LABEL: Record<EnergyMode, string> = {
  ideal: 'Ideal',
  low: '30%',
  rushed: 'Rushed',
};

function BatteryData({ energyScore, energyMode, onPress }: { energyScore: number; energyMode: EnergyMode; onPress?: () => void }) {
  const energyLevel = energyScoreToLevel(energyScore);
  const showMode = energyMode !== 'ideal';

  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel="Ajustar modo de energia" className="flex flex-col active:opacity-80">
      <View className="flex-row items-center">
        <Text className="text-zinc-900 dark:text-zinc-50">Sua energia corporal</Text>
        {showMode ? (
          <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
            <Text className="text-[10px] font-semibold" style={{ color: ACCENT }}>
              {MODE_LABEL[energyMode]}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex flex-row items-center">
        <Zap size={22} color={ENERGY.high} style={{ marginRight: 6 }} />
        <LevelDots value={energyLevel || 0} accent={ENERGY.high} isDark={false} big />
      </View>
    </Pressable>
  );
}

export default function Header({ isDark, energyScore, energyMode = 'ideal', onLogout, onOpenConfig, onOpenFilter, onOpenEnergyMode }: HeaderProps) {
  return (
    <View className="flex-row items-start justify-between pt-2">
      <View className="flex-row items-center">
        <Pressable onPress={onOpenFilter} accessibilityRole="button" accessibilityLabel="Filtros" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
          <ListChecks size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>

        <View className="ml-3 flex-col">
          <BatteryData energyScore={energyScore} energyMode={energyMode} onPress={onOpenEnergyMode} />
        </View>
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
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
