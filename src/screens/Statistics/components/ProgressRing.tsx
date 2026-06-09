import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type ProgressRingProps = {
  /** 0–100. */
  percent: number;
  isDark: boolean;
  size?: number;
  accent?: string;
};

export default function ProgressRing({ percent, isDark, size = 168, accent = '#2f80ff' }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashedRadius = radius + stroke / 2 + 3;
  const center = size / 2;
  const innerSize = size - stroke * 2 - 18;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={dashedRadius} stroke={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(20,30,55,0.28)'} strokeWidth={1} strokeDasharray="2 5" fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      <View
        className="absolute items-center justify-center rounded-full"
        style={{
          width: innerSize,
          height: innerSize,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
        }}
      >
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{clamped}%</Text>
        <Text className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">Progresso</Text>
      </View>
    </View>
  );
}
