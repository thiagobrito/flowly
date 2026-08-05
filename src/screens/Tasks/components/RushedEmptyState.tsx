/**
 * Estado vazio do modo Rushed.
 *
 * Rushed esconde tudo que não seja curto e de alto impacto, então esvaziar a
 * lista é um resultado legítimo — mas indistinguível de uma falha de rede se a
 * tela apenas ficar em branco. Este bloco nomeia o motivo e oferece a saída.
 */

import { Zap } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { RUSHED_MAX_MINUTES, RUSHED_MIN_IMPACT } from '@/lib/energyMode';

type RushedEmptyStateProps = {
  isDark: boolean;
  onShowAll: () => void;
};

export default function RushedEmptyState({ isDark, onShowAll }: RushedEmptyStateProps) {
  return (
    <View
      className="mt-2 items-center rounded-2xl border px-5 py-6"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <View className="mb-3 size-11 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.10)' }}>
        <Zap size={20} color="#6366f1" />
      </View>

      <Text className="text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">Nada rápido por aqui</Text>
      <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No modo Corrido, a lista só mostra atividades de impacto {RUSHED_MIN_IMPACT}+ que caibam em {RUSHED_MAX_MINUTES} minutos. Hoje nenhuma se encaixa.
      </Text>

      <Pressable onPress={onShowAll} accessibilityRole="button" accessibilityLabel="Ver todas as atividades" className="mt-4 rounded-full px-5 py-2.5 active:opacity-80" style={{ backgroundColor: '#6366f1' }}>
        <Text className="text-sm font-semibold text-white">Ver todas as atividades</Text>
      </Pressable>
    </View>
  );
}
