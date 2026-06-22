import { Zap } from 'lucide-react-native';
import type { TextStyle } from 'react-native';
import { Text, View } from 'react-native';

import LevelDots from '../../Tasks/components/LevelDots';

const ENERGY_ACCENT = '#22c55e';

type CalendarHourLabelProps = {
  hourStr: string;
  style: TextStyle;
  level?: number;
  isDark: boolean;
};

export default function CalendarHourLabel({ hourStr, style, level, isDark }: CalendarHourLabelProps) {
  if (level === undefined) {
    return <Text style={style}>{hourStr}</Text>;
  }

  return (
    <View className="flex min-h-10 flex-col self-end">
      <Text style={style}>{hourStr}</Text>
      <View className="mt-2 flex flex-row gap-1">
        <Zap size={12} color={ENERGY_ACCENT} />
        <LevelDots value={level} accent={ENERGY_ACCENT} isDark={isDark} />
      </View>
    </View>
  );
}
