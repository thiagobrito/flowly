import { Pressable, Text, View } from 'react-native';

import type { SubscriptionPlanId } from '@/lib/subscription';

type PlanToggleProps = {
  value: SubscriptionPlanId;
  onChange: (plan: SubscriptionPlanId) => void;
  isDark: boolean;
};

const OPTIONS: { id: SubscriptionPlanId; label: string }[] = [
  { id: 'flowly_yearly', label: 'Anual' },
  { id: 'flowly_montly', label: 'Mensal' },
];

export default function PlanToggle({ value, onChange, isDark }: PlanToggleProps) {
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View className="self-center rounded-full p-1" style={{ backgroundColor: trackBg }}>
      <View className="flex-row">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          let bg = 'transparent';
          let color = isDark ? '#d4d4d8' : '#71717a';

          if (selected) {
            bg = isDark ? '#f4f4f5' : '#ffffff';
            color = isDark ? '#0b1220' : '#18181b';
          }

          return (
            <Pressable key={option.id} onPress={() => onChange(option.id)} accessibilityRole="button" accessibilityState={{ selected }} className="active:opacity-80">
              <View className="rounded-full px-8 py-2.5" style={{ backgroundColor: bg }}>
                <Text className="text-sm font-semibold" style={{ color }}>
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
