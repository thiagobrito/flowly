import { BatteryFull, LogOut, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type HeaderProps = {
  isDark: boolean;
  energyScore: number;
  onLogout?: () => void;
};

function EnergyColor(energyScore: number) {
  if (energyScore >= 80) return 'text-green-600';
  if (energyScore >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function IconColor(energyScore: number) {
  if (energyScore >= 80) return 'green';
  if (energyScore >= 40) return 'yellow';
  return 'red';
}

export default function Header({ isDark, energyScore, onLogout }: HeaderProps) {
  return (
    <View className="flex-row items-start justify-between pt-2">
      <View className="flex-col">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Suas atividades,</Text>
        <View className="flex flex-row">
          <BatteryFull className={`my-auto flex ${EnergyColor(energyScore)}`} size={28} color={IconColor(energyScore)} />
          <Text className={`ml-2 flex rounded-xl text-lg ${EnergyColor(energyScore)}`}>Energia corporal de {energyScore}%</Text>
        </View>
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
