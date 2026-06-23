import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const ACCENT = '#6366f1';

type NavFooterProps = {
  label: string;
  enabled: boolean;
  loading?: boolean;
  skipLabel?: string;
  onPress: () => void;
  onSkip?: () => void;
};

export default function NavFooter({ label, enabled, loading, skipLabel, onPress, onSkip }: NavFooterProps) {
  const disabled = !enabled || loading;

  return (
    <View className="pb-2 pt-3">
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} className="items-center rounded-2xl py-4 active:opacity-85" style={{ backgroundColor: ACCENT, opacity: disabled ? 0.4 : 1 }}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">{label}</Text>}
      </Pressable>

      {skipLabel && onSkip ? (
        <Pressable onPress={onSkip} accessibilityRole="button" className="mt-2 items-center py-2 active:opacity-70">
          <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{skipLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
