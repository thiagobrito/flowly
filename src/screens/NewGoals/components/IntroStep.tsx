import type { LucideIcon } from 'lucide-react-native';
import { CalendarRange, Gauge, Target } from 'lucide-react-native';
import { Text, View } from 'react-native';

const ACCENT = '#6366f1';

const HIGHLIGHTS: { Icon: LucideIcon; title: string; description: string }[] = [
  { Icon: CalendarRange, title: 'Defina seu ciclo', description: 'Um período curto e focado para executar.' },
  { Icon: Target, title: 'Escolha sua meta principal', description: 'O que realmente importa neste momento.' },
  { Icon: Gauge, title: 'Crie métricas claras', description: 'Para acompanhar o progresso de verdade.' },
];

export default function IntroStep({ isDark, total }: { isDark: boolean; total: number }) {
  return (
    <View>
      <View className="gap-3">
        {HIGHLIGHTS.map((item) => (
          <View key={item.title} className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
            <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
              <item.Icon size={20} color={ACCENT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</Text>
              <Text className="mt-0.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className="mt-5 text-center text-sm text-zinc-400 dark:text-zinc-500">Leva menos de 2 minutos · {total} etapas</Text>
    </View>
  );
}
