import { BatteryFull, LogOut, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type HeaderProps = {
  isDark: boolean;
  energyScore: number;
  onLogout?: () => void;
};

function BatteryData({ energyScore }: { energyScore: number }) {
  let color = 'bg-red-800/80';
  if (energyScore >= 80) color = 'bg-green-800/80';
  if (energyScore >= 40) color = 'bg-yellow-600/70';

  return (
    <View className={`flex flex-row ${color} rounded-xl px-2`}>
      <BatteryFull className="my-auto flex" size={28} color="white" />
      <Text className="ml-2 flex rounded-xl text-lg text-white">Energia corporal de {energyScore}%</Text>
    </View>
  );
}

export default function Header({ isDark, energyScore, onLogout }: HeaderProps) {
  return (
    <View className="flex-row items-start justify-between pt-2">
      <View className="flex-col">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Suas atividades,</Text>
        <BatteryData energyScore={energyScore} />
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Settings" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
          <SlidersHorizontal size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>

        {onLogout ? (
          <Pressable onPress={onLogout} accessibilityRole="button" accessibilityLabel="Sair" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
            <LogOut size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
