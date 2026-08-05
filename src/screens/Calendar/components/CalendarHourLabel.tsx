import { Zap } from 'lucide-react-native';
import type { TextStyle } from 'react-native';
import { Text, View } from 'react-native';

import { ENERGY } from '@/lib/theme';

import LevelDots from '../../Tasks/components/LevelDots';

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
        <Zap size={12} color={ENERGY.high} />
        <LevelDots value={level} accent={ENERGY.high} isDark={isDark} />
      </View>
    </View>
  );
}
