import { LinearGradient } from 'expo-linear-gradient';
import { FlagIcon, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type EmptyStateProps = {
  isDark: boolean;
  onCreate?: () => void;
};

export default function EmptyState({ isDark, onCreate }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <View className="size-20 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)' }}>
        <FlagIcon size={36} color="#3b82f6" />
      </View>

      <Text className="mt-6 text-center text-xl font-bold text-zinc-900 dark:text-zinc-50">Defina sua primeira meta</Text>
      <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">Metas transformam visão em execução. Comece com um resultado significativo para as próximas 12 semanas.</Text>

      <Pressable onPress={onCreate} accessibilityRole="button" accessibilityLabel="Criar meta" className="mt-8 overflow-hidden rounded-2xl active:opacity-80">
        <LinearGradient colors={['#3b82f6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14 }}>
          <Plus size={18} color="#ffffff" strokeWidth={2.6} />
          <Text className="ml-2 text-base font-semibold text-white">Criar meta</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
