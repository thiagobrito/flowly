import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { LIFE_AREAS } from '@/screens/common';
import type { SecondaryGoalSetup } from '@/screens/Goals/data';

import { createEmptyMetric } from '../data';
import { areaBackgroundColor, areaBorderColor, areaTextColor } from './areaStyle';

const SELECTABLE_AREAS = LIFE_AREAS.filter((area) => area.id !== 'goal');

type LifeAreaMultiStepProps = {
  value: SecondaryGoalSetup[];
  excludeAreaId?: string;
  isDark: boolean;
  onChange: (goals: SecondaryGoalSetup[]) => void;
};

export default function LifeAreaMultiStep({ value, excludeAreaId, isDark, onChange }: LifeAreaMultiStepProps) {
  const areas = SELECTABLE_AREAS.filter((area) => area.id !== excludeAreaId);

  const toggle = (areaId: string, label: string) => {
    const exists = value.some((goal) => goal.label === areaId);
    if (exists) {
      onChange(value.filter((goal) => goal.label !== areaId));
      return;
    }
    onChange([...value, { label: areaId, name: label, rpm: { result: '', purpose: '', impact: '' }, metrics: [createEmptyMetric()] }]);
  };

  return (
    <View className="-mx-1 flex-row flex-wrap">
      {areas.map((area) => {
        const selected = value.some((goal) => goal.label === area.id);
        const AreaIcon = area.Icon;
        const borderColor = areaBorderColor(selected, area.accent, isDark);
        const backgroundColor = areaBackgroundColor(selected, area.accent, isDark);

        return (
          <View key={area.id} className="w-1/2 p-1">
            <Pressable onPress={() => toggle(area.id, area.label)} accessibilityRole="button" accessibilityState={{ selected }} className="active:opacity-80">
              <View className="flex-row items-center rounded-2xl border p-3.5" style={{ borderColor, backgroundColor, borderWidth: 1 }}>
                <View className="size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${area.accent}1f` }}>
                  <AreaIcon size={18} color={area.accent} />
                </View>
                <Text className="ml-2.5 flex-1 text-sm font-semibold" style={{ color: areaTextColor(selected, area.accent, isDark) }} numberOfLines={1}>
                  {area.label}
                </Text>
                {selected ? <Check size={16} color={area.accent} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
