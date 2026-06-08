import { BatteryFull, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type HeaderProps = {
  isDark: boolean;
  energyInfo: { score?: number | null };
};

export default function Header({ isDark, energyInfo }: HeaderProps) {
  return (
    <View className="flex-row items-start justify-between pt-2">
      <View className="flex-col">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Suas atividades,
        </Text>
        <View className="flex flex-row">
          <BatteryFull
            className="my-auto flex"
            size={24}
            color={isDark ? '#e4e4e7' : 'green'}
          />
          <Text className="my-auto ml-2 flex rounded-xl text-lg text-green-700">
            Energia corporal de {energyInfo.score}%
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        className="h-10 w-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10"
      >
        <SlidersHorizontal size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
      </Pressable>
    </View>
  );
}
