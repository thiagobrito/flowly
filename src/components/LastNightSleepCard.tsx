/**
 * # Sono de ontem
 *
 * A noite que produziu a curva de hoje, em uma linha: deitou, acordou, total.
 *
 * O dado vem do mesmo `FlowlyEngineInput` que alimenta o `PeakEnergyCard`, e
 * não de uma segunda leitura do `sleepProfile`. Ler o perfil de novo abriria a
 * chance de o card mostrar uma noite e a curva ao lado ter sido calculada com
 * outra — o override do dia, os dados do Health e os horários usuais se
 * combinam em `applySleepProfile`, e o resultado dessa combinação é o input.
 */

import { Moon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { FlowlyEngineInput } from '@/lib/energy';
import { mutedText, surface } from '@/lib/theme';

type LastNightSleepCardProps = {
  input: FlowlyEngineInput | null;
  isDark: boolean;
};

export type SleepNightSummary = {
  /** Horário de deitar, `23h15`. */
  bed: string;
  /** Horário de acordar, `7h10`. */
  wake: string;
  /** Duração dormida, `7h55`. */
  total: string;
};

function clockLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
}

/** `7.9` → `7h54`. Duração, não horário: a hora não tem zero à esquerda. */
function durationLabel(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`;
}

/**
 * Resumo da noite, ou `null` quando falta qualquer parte dela.
 *
 * Meia noite não vale a pena mostrar: "acordou 7h10" sem a hora de deitar não
 * responde a pergunta que o card existe para responder.
 */
export function summarizeNight(input: FlowlyEngineInput | null): SleepNightSummary | null {
  if (!input) return null;

  const bed = clockLabel(input.bedTime);
  const wake = clockLabel(input.wakeTime);
  if (!bed || !wake) return null;

  const slept = input.lastNightSleepHours ?? (new Date(input.wakeTime!).getTime() - new Date(input.bedTime!).getTime()) / 3_600_000;
  if (!Number.isFinite(slept) || slept <= 0) return null;

  return { bed, wake, total: durationLabel(slept) };
}

export default function LastNightSleepCard({ input, isDark }: LastNightSleepCardProps) {
  const night = summarizeNight(input);
  if (!night) return null;

  const muted = mutedText(isDark);

  return (
    <View
      className="flex-row items-center rounded-2xl border px-4 py-3"
      style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}
      accessibilityLabel={`Sono de ontem: deitou ${night.bed}, acordou ${night.wake}, ${night.total} dormidos`}
    >
      <Moon size={16} color={muted} />

      <View className="ml-3 flex-1">
        <Text className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
          Sono de ontem
        </Text>
        <Text className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {night.bed} → {night.wake}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{night.total}</Text>
        <Text className="text-[11px]" style={{ color: muted }}>
          dormidos
        </Text>
      </View>
    </View>
  );
}
