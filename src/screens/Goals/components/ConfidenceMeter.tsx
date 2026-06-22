import { Lightbulb } from 'lucide-react-native';
import { Text, View } from 'react-native';

type ConfidenceMeterProps = {
  confidence: number;
  isDark: boolean;
};

const LOW_CONFIDENCE_TIPS = ['Reduzir o escopo', 'Aumentar o foco', 'Recomprometer-se com as ações semanais'];

function confidenceColor(value: number) {
  if (value >= 8) return '#22c55e';
  if (value >= 5) return '#eab308';
  return '#ef4444';
}

export default function ConfidenceMeter({ confidence, isDark }: ConfidenceMeterProps) {
  const clamped = Math.min(10, Math.max(1, confidence));
  const color = confidenceColor(clamped);
  const showTips = clamped < 7;

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Confiança em alcançar</Text>
        <Text className="text-sm font-bold" style={{ color }}>
          {clamped}/10
        </Text>
      </View>

      <View className="flex-row gap-1">
        {Array.from({ length: 10 }, (_, index) => {
          const filled = index < clamped;
          const emptyColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
          return <View key={index} className="h-2 flex-1 rounded-full" style={{ backgroundColor: filled ? color : emptyColor }} />;
        })}
      </View>

      {showTips ? (
        <View className="mt-1 gap-1.5 rounded-xl p-3" style={{ backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.12)' }}>
          <View className="flex-row items-center gap-1.5">
            <Lightbulb size={14} color="#eab308" />
            <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Sugestões para recuperar confiança</Text>
          </View>
          {LOW_CONFIDENCE_TIPS.map((tip) => (
            <Text key={tip} className="text-xs text-zinc-600 dark:text-zinc-300">
              • {tip}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
