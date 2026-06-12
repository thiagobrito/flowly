import { View } from 'react-native';

type ProgressBarProps = {
  progress: number;
  isDark: boolean;
  color?: string;
  height?: number;
};

export default function ProgressBar({ progress, isDark, color = '#6366f1', height = 6 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View className="w-full overflow-hidden rounded-full" style={{ height, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: clamped }}>
      <View className="h-full rounded-full" style={{ width: `${clamped}%`, backgroundColor: color }} />
    </View>
  );
}
