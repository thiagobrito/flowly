/**
 * Cartão de destaque da meta principal.
 *
 * A aba mostrava todas as metas com o mesmo peso e um chip "Meta principal"
 * como única distinção — o que anula o próprio conceito de meta principal. Aqui
 * ela ocupa a primeira dobra inteira e as outras viram linhas.
 *
 * Do RPM entra só o **Propósito**. Resultado é o nome da meta dito de novo, e
 * Impacto é consequência de longo prazo: nenhum dos dois responde "por que eu
 * ainda estou nisso na semana 8", que é a pergunta desta tela. Os três
 * continuam no card completo, a um toque de distância.
 */

import { ChevronDown, ChevronRight, Heart } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { accentOn, mutedText, surface } from '@/lib/theme';
import { GetLifeArea } from '@/screens/common';
import ProgressBar from '@/screens/Config/Goals/components/ProgressBar';

import { computeMetricProgress, cycleWeekLabel, formatMetricValue, type Goal, resolveMetricUnit } from '../data';

type GoalHeroCardProps = {
  goal: Goal;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export default function GoalHeroCard({ goal, isDark, expanded, onToggle }: GoalHeroCardProps) {
  const area = GetLifeArea(goal.areaId);
  const accent = area?.accent ?? accentOn(isDark);
  const AreaIcon = area?.Icon;
  const muted = mutedText(isDark);
  const metric = goal.metrics[0];
  const unit = metric ? resolveMetricUnit(metric) : null;

  return (
    <View className="rounded-3xl border p-5" style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}>
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="mt-0.5 size-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}22` }}>
          {AreaIcon ? <AreaIcon size={22} color={accent} /> : null}
        </View>

        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
            Meta principal
          </Text>
          <Text className="mt-0.5 text-[20px] font-bold leading-7 text-zinc-900 dark:text-zinc-50">{goal.name}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline justify-between">
        <Text className="text-[13px] font-semibold" style={{ color: accent }}>
          {cycleWeekLabel(goal)}
        </Text>
        <Text className="text-[13px] font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{goal.progress}%</Text>
      </View>

      <View className="mt-2">
        <ProgressBar progress={goal.progress} isDark={isDark} color={accent} height={10} />
      </View>

      {metric && unit ? (
        <View className="mt-4">
          <Text className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
            {metric.label}
          </Text>
          <View className="mt-0.5 flex-row items-baseline">
            <Text className="text-[32px] font-bold tabular-nums leading-9 text-zinc-900 dark:text-zinc-50">{formatMetricValue(metric.current, unit)}</Text>
            <Text className="ml-2 text-base font-medium" style={{ color: muted }}>
              de {formatMetricValue(metric.target, unit)}
            </Text>
            <Text className="ml-auto text-[13px] font-semibold" style={{ color: accent }}>
              {computeMetricProgress(metric)}%
            </Text>
          </View>
        </View>
      ) : null}

      {goal.rpm.purpose ? (
        <View className="mt-4 flex-row" style={{ gap: 10 }}>
          <View className="mt-0.5 size-7 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1f` }}>
            <Heart size={14} color={accent} />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
              Propósito
            </Text>
            <Text className="mt-0.5 text-sm leading-5 text-zinc-700 dark:text-zinc-200">{goal.rpm.purpose}</Text>
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${goal.name}`}
        accessibilityState={{ expanded }}
        className="mt-4 flex-row items-center justify-center rounded-xl py-2.5 active:opacity-80"
        style={{ backgroundColor: `${accent}14` }}
      >
        <Text className="mr-1 text-[13px] font-semibold" style={{ color: accent }}>
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        </Text>
        {expanded ? <ChevronDown size={16} color={accent} /> : <ChevronRight size={16} color={accent} />}
      </Pressable>
    </View>
  );
}
