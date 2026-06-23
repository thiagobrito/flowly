import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type ProgressOverviewProps = {
  progress: number;
  daysRemaining: number;
  weeksCompleted: number;
  totalWeeks: number;
  isDark: boolean;
  accent: string;
  points: number;
};

function ProgressRing({ progress, isDark, accent, size = 96 }: { progress: number; isDark: boolean; accent: string; size?: number }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,30,55,0.12)'} strokeWidth={stroke} fill="none" />
        <Circle cx={center} cy={center} r={radius} stroke={accent} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${center} ${center})`} />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{clamped}%</Text>
        <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">completo</Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1">
      <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{value}</Text>
      <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}

export default function ProgressOverview({ progress, daysRemaining, weeksCompleted, totalWeeks, isDark, accent, points }: ProgressOverviewProps) {
  return (
    <View className="flex-row items-center gap-4">
      <ProgressRing progress={progress} isDark={isDark} accent={accent} />
      <View className="flex-1 gap-3">
        <Stat value={`${daysRemaining}`} label="Dias restantes" />
        <Stat value={`${weeksCompleted} de ${totalWeeks}`} label="Semanas concluídas" />
      </View>

      <View className="flex-1 items-center justify-center rounded-full bg-green-400/20 bg-zinc-100 p-2 text-center">
        <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{points} pontos</Text>
      </View>
    </View>
  );
}
