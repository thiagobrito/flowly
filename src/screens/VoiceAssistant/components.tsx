import { Mic } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const ACCENT = '#6366f1';

type ListeningIndicatorProps = {
  listening: boolean;
  processing: boolean;
  isDark: boolean;
  onPress: () => void;
};

/**
 * Botão/indicador central de escuta, estilo assistente de voz: um círculo com
 * microfone que pulsa enquanto escuta. Tocar reinicia a escuta quando parado.
 */
export function ListeningIndicator({ listening, processing, isDark, onPress }: ListeningIndicatorProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (listening) {
      pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [listening, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.35 - pulse.value * 0.2,
  }));

  const label = (() => {
    if (processing) return 'Entendendo...';
    if (listening) return 'Estou ouvindo';
    return 'Toque para falar';
  })();

  const idleBackground = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.12)';

  return (
    <View className="items-center">
      <Pressable onPress={onPress} disabled={listening || processing} accessibilityRole="button" accessibilityLabel={label} className="items-center justify-center active:opacity-80" style={{ width: 132, height: 132 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 132,
              height: 132,
              borderRadius: 66,
              backgroundColor: ACCENT,
            },
            haloStyle,
          ]}
        />
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 88,
            height: 88,
            backgroundColor: listening ? ACCENT : idleBackground,
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: listening ? 0.5 : 0.15,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <Mic size={36} color={listening ? '#ffffff' : ACCENT} strokeWidth={2.2} />
        </View>
      </Pressable>
      <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}
