import { LinearGradient } from 'expo-linear-gradient';
import { Crown, LogOut } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TrialEndedProps = {
  isDark: boolean;
  /** Reabre o paywall para assinar. */
  onSeePlans: () => void;
  onLogout: () => void;
};

/**
 * Tela de bloqueio exibida quando o período de teste terminou e o usuário
 * fechou o paywall sem assinar. Única saída sem assinar: encerrar a sessão.
 */
export default function TrialEnded({ isDark, onSeePlans, onLogout }: TrialEndedProps) {
  const titleColor = isDark ? '#fafafa' : '#18181b';
  const subtitleColor = isDark ? '#a1a1aa' : '#52525b';

  return (
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="size-16 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
          <Crown size={28} color="#6366f1" />
        </View>

        <Text className="mt-6 text-center text-2xl font-bold" style={{ color: titleColor }}>
          Seu período de teste terminou
        </Text>
        <Text className="mt-3 text-center text-base leading-6" style={{ color: subtitleColor }}>
          Assine o Flowly Premium para continuar acompanhando suas metas, atividades e energia.
        </Text>

        <Pressable onPress={onSeePlans} accessibilityRole="button" className="mt-8 w-full active:opacity-90">
          <LinearGradient colors={['#3b82f6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-base font-semibold text-white">Ver planos</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onLogout} accessibilityRole="button" className="mt-5 flex-row items-center active:opacity-70">
          <LogOut size={16} color={subtitleColor} />
          <Text className="ml-2 text-sm font-medium" style={{ color: subtitleColor }}>
            Sair da conta
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
