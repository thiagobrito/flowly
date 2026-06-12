import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type AICardProps = {
  recommendation: string;
  isDark: boolean;
  onAskAI: () => void;
};

export default function AICard({ recommendation, isDark, onAskAI }: AICardProps) {
  return (
    <View className="overflow-hidden rounded-2xl border" style={{ borderColor: isDark ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.25)' }}>
      <LinearGradient colors={isDark ? ['rgba(99,102,241,0.16)', 'rgba(168,85,247,0.12)'] : ['rgba(99,102,241,0.08)', 'rgba(168,85,247,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View className="flex-row items-center">
          <View className="size-9 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.12)' }}>
            <Sparkles size={18} color="#a855f7" />
          </View>
          <Text className="ml-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Recomendação da IA</Text>
        </View>

        <Text className="mt-3 text-sm leading-5 text-zinc-700 dark:text-zinc-300">{recommendation}</Text>

        <Pressable onPress={onAskAI} accessibilityRole="button" className="mt-4 items-center rounded-xl py-2.5 active:opacity-85" style={{ backgroundColor: '#a855f7' }}>
          <Text className="text-sm font-semibold text-white">Perguntar à IA</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
