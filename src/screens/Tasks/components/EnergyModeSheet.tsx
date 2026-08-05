import { BatteryLow, Check, Sparkles, Zap } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import BottomSheetModal from '@/components/BottomSheetModal';
import { ENERGY_MODE_OPTIONS, type EnergyMode } from '@/lib/energyMode';

type EnergyModeSheetProps = {
  visible: boolean;
  isDark: boolean;
  currentMode: EnergyMode;
  engineScore: number;
  onSelect: (mode: EnergyMode) => void;
  onClose: () => void;
};

const MODE_ICON = {
  ideal: Sparkles,
  low: BatteryLow,
  rushed: Zap,
} as const;

export default function EnergyModeSheet({ visible, isDark, currentMode, engineScore, onSelect, onClose }: EnergyModeSheetProps) {
  const iconColor = isDark ? '#e4e4e7' : '#27272a';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const idleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const selectedBackground = isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)';

  return (
    <BottomSheetModal visible={visible} onClose={onClose} isDark={isDark}>
      <View className="mb-4 items-center">
        <View className="mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Como está sua energia?</Text>
        <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">Motor agora: {Math.round(engineScore)}. Escolher um modo reorganiza seu dia — e tudo bem.</Text>
      </View>

      {ENERGY_MODE_OPTIONS.map((option) => {
        const Icon = MODE_ICON[option.mode];
        const selected = currentMode === option.mode;

        return (
          <Pressable
            key={option.mode}
            onPress={() => onSelect(option.mode)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            className="mb-2 flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80"
            style={{
              borderColor: selected ? 'rgba(99,102,241,0.55)' : idleBorder,
              backgroundColor: selected ? selectedBackground : 'transparent',
            }}
          >
            <View className="mr-3 size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
              <Icon size={18} color={selected ? '#6366f1' : iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{option.label}</Text>
              <Text className="mt-0.5 text-xs" style={{ color: muted }}>
                {option.description}
              </Text>
            </View>
            {selected ? <Check size={18} color="#6366f1" /> : null}
          </Pressable>
        );
      })}
    </BottomSheetModal>
  );
}
