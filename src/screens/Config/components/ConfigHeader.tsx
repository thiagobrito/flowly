import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type ConfigHeaderProps = {
  isDark: boolean;
  onBack: () => void;
};

export default function ConfigHeader({ isDark, onBack }: ConfigHeaderProps) {
  return (
    <View className="flex-row items-center pt-2">
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-80 dark:bg-white/10">
        <ChevronLeft size={22} color={isDark ? '#e4e4e7' : '#27272a'} />
      </Pressable>
      <Text className="ml-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Configurações</Text>
    </View>
  );
}
