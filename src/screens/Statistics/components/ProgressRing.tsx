import { ArrowBigDownDash, ArrowBigUp } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type ProgressRingProps = {
  /** 0–100. */
  totalScore: number;
  averageFromLast7Days: number;
  isDark: boolean;
  size?: number;
  accent?: string;
};

function TrendIcon({ totalScore, averageFromLast7Days, accent }: { totalScore: number; averageFromLast7Days: number; accent: string }) {
  const trend = totalScore > averageFromLast7Days ? 'up' : 'down';
  const color = trend === 'up' ? accent : 'rgba(239,68,68,0.90)';
  return (
    <View className="items-center justify-center rounded-full p-2" style={{ backgroundColor: color }}>
      {trend === 'up' ? <ArrowBigUp size={15} color="white" /> : <ArrowBigDownDash size={15} color="white" />}
    </View>
  );
}

export default function ProgressRing({ totalScore, averageFromLast7Days, isDark, size = 168, accent = '#2f80ff' }: ProgressRingProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashedRadius = radius + stroke / 2 + 3;
  const center = size / 2;
  const innerSize = size - stroke * 2 - 18;

  const trend = totalScore > averageFromLast7Days ? 'up' : 'down';
  const color = trend === 'up' ? accent : 'rgba(239,68,68,0.90)';

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={dashedRadius} stroke={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(20,30,55,0.28)'} strokeWidth={1} strokeDasharray="2 5" fill="none" />
        <Circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={circumference} strokeDashoffset={0} transform={`rotate(-90 ${center} ${center})`} />
      </Svg>

      <View
        className="absolute items-center justify-center rounded-full"
        style={{
          width: innerSize,
          height: innerSize,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
        }}
      >
        <View className="flex-col items-center justify-center">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalScore}</Text>
          <View className="flex flex-row items-center justify-center gap-2">
            <Text className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">Pontos</Text>

            <TrendIcon totalScore={totalScore} averageFromLast7Days={averageFromLast7Days} accent={accent} />
          </View>
        </View>
      </View>
    </View>
  );
}
