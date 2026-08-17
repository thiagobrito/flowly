/**
 * Cabeçalho da Home.
 *
 * A energia saiu daqui. Antes o header carregava "Sua energia corporal" com os
 * dots, e o número competia com o `PeakEnergyCard` logo abaixo — dois lugares
 * dizendo a mesma coisa em escalas diferentes (0–5 e 0–100). Agora o header só
 * situa (marca, saudação, promessa do dia) e o cartão é o dono do número.
 *
 * O modo de energia continua acessível: quando está diferente de `ideal`, a
 * pílula aparece ao lado da saudação, que é o único lugar onde o estado
 * "estou em 30% hoje" ainda precisa ser visível sem rolar.
 */

import { ListChecks, LogOut, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import DisplayText from '@/components/DisplayText';
import type { EnergyMode } from '@/lib/energyMode';
import { ACCENT, mutedText } from '@/lib/theme';

type HeaderProps = {
  isDark: boolean;
  energyMode?: EnergyMode;
  onLogout?: () => void;
  onOpenConfig?: () => void;
  onOpenFilter?: () => void;
  onOpenEnergyMode?: () => void;
};

const MODE_LABEL: Record<EnergyMode, string> = {
  ideal: 'Ideal',
  low: '30%',
  rushed: 'Rushed',
};

/** Saudação pelo horário local. Sem nome: o cadastro não coleta um. */
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Header({ isDark, energyMode = 'ideal', onLogout, onOpenConfig, onOpenFilter, onOpenEnergyMode }: HeaderProps) {
  const muted = mutedText(isDark);
  const showMode = energyMode !== 'ideal';

  return (
    <View className="pt-2">
      <View className="flex-row items-center justify-between">
        <DisplayText weight="bold" className="text-[26px] leading-8 text-zinc-900 dark:text-zinc-50">
          Flowly
        </DisplayText>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable onPress={onOpenFilter} accessibilityRole="button" accessibilityLabel="Filtros" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
            <ListChecks size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>

          <Pressable onPress={onOpenConfig} accessibilityRole="button" accessibilityLabel="Configurações" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
            <SlidersHorizontal size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
          </Pressable>

          {onLogout ? (
            <Pressable onPress={onLogout} accessibilityRole="button" accessibilityLabel="Sair" className="size-10 items-center justify-center rounded-full bg-white/40 dark:bg-white/10">
              <LogOut size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable onPress={onOpenEnergyMode} disabled={!onOpenEnergyMode} accessibilityRole="button" accessibilityLabel="Ajustar modo de energia" className="mt-2 active:opacity-80">
        <View className="flex-row items-center">
          <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{greeting()}</Text>
          {showMode ? (
            <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: `${ACCENT}22` }}>
              <Text className="text-[10px] font-semibold" style={{ color: ACCENT }}>
                {MODE_LABEL[energyMode]}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[13px]" style={{ color: muted }}>
          Seu plano foi ajustado para você render melhor hoje.
        </Text>
      </Pressable>
    </View>
  );
}
