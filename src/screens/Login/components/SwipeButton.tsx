import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text } from 'react-native';

type SwipeButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function SwipeButton({ label, onPress, disabled = false }: SwipeButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} className="active:opacity-90" style={{ opacity: disabled ? 0.5 : 1 }}>
      <LinearGradient
        colors={['#3b82f6', '#6366f1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 48,
          borderRadius: 999,
          padding: 6,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        <Text className="m-auto flex text-center text-base font-semibold text-white">{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
