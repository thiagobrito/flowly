import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

const ACCENT = '#6366f1';

type ProgressHeaderProps = {
  current: number;
  total: number;
  isDark: boolean;
  canGoBack: boolean;
  onBack: () => void;
};

/** Cabeçalho com barra de progresso do onboarding (estilo do NewGoals). */
export default function ProgressHeader({ current, total, isDark, canGoBack, onBack }: ProgressHeaderProps) {
  const percent = total > 1 ? Math.round(((current + 1) / total) * 100) : 100;
  const trackColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  return (
    <View className="pt-2">
      <View className="h-10 flex-row items-center justify-between">
        {canGoBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-80 dark:bg-white/10">
            <ChevronLeft size={22} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>
        ) : (
          <View className="size-10" />
        )}

        <Text className="text-sm font-semibold" style={{ color: ACCENT }}>
          Etapa {current + 1} de {total}
        </Text>

        <View className="size-10" />
      </View>

      <View className="mt-2 w-full overflow-hidden rounded-full" style={{ height: 6, backgroundColor: trackColor }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: ACCENT }} />
      </View>
    </View>
  );
}
