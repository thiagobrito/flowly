import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type NavFooterProps = {
  label: string;
  enabled?: boolean;
  loading?: boolean;
  skipLabel?: string;
  onPress: () => void;
  onSkip?: () => void;
};

/** Rodapé de navegação com botão primário em gradiente e ação secundária. */
export default function NavFooter({ label, enabled = true, loading = false, skipLabel, onPress, onSkip }: NavFooterProps) {
  const disabled = !enabled || loading;

  return (
    <View className="pb-2 pt-3">
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} className="active:opacity-90" style={{ opacity: disabled ? 0.5 : 1 }}>
        <LinearGradient
          colors={['#3b82f6', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 52,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#6366f1',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">{label}</Text>}
        </LinearGradient>
      </Pressable>

      {skipLabel && onSkip ? (
        <Pressable onPress={onSkip} accessibilityRole="button" className="mt-3 items-center py-2 active:opacity-70">
          <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{skipLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
