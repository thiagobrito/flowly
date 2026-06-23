import { Text, View } from 'react-native';

import { GetLifeArea } from '@/screens/common';
import { formatDate } from '@/screens/Config/Goals/dateUtils';
import type { GoalSetup, GoalSetupMetric } from '@/screens/Goals/data';
import { cycleWeeks, inferMetricDirection } from '@/screens/Goals/data';

const ACCENT = '#6366f1';

function Card({ title, isDark, children }: { title: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)' }}>
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{title}</Text>
      <View className="mt-2.5">{children}</View>
    </View>
  );
}

function RpmLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View className="mt-2">
      <Text className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm leading-5 text-zinc-700 dark:text-zinc-300">{value}</Text>
    </View>
  );
}

function MetricSummary({ metric }: { metric: GoalSetupMetric }) {
  const direction = metric.direction ?? inferMetricDirection(metric.current, metric.target);
  const isDecrease = direction === 'decrease';

  return (
    <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
      {metric.current} → {metric.target}
      {isDecrease ? <Text className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> (reduzir)</Text> : null}
    </Text>
  );
}

export default function ReviewStep({ setup, isDark, scope = 'full' }: { setup: GoalSetup; isDark: boolean; scope?: 'full' | 'secondaryOnly' }) {
  const weeks = cycleWeeks(setup.cycle.startDate, setup.cycle.endDate);
  const mainArea = GetLifeArea(setup.mainGoal.label);
  const MainIcon = mainArea?.Icon;
  const validMetrics = setup.mainGoal.metrics.filter((metric) => metric.label.trim().length > 0);

  const secondaryGoalsCard =
    setup.secondaryGoals.length > 0 ? (
      <Card title="Metas secundárias" isDark={isDark}>
        <View className="gap-3">
          {setup.secondaryGoals.map((goal, goalIndex) => {
            const area = GetLifeArea(goal.label);
            const accent = area?.accent ?? ACCENT;
            const AreaIcon = area?.Icon;
            const goalMetrics = goal.metrics.filter((metric) => metric.label.trim().length > 0);

            return (
              <View key={goal.label} className={goalIndex > 0 ? 'border-t pt-3' : undefined} style={goalIndex > 0 ? { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined}>
                <View className="flex-row items-center">
                  {AreaIcon ? (
                    <View className="size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1f` }}>
                      <AreaIcon size={16} color={accent} />
                    </View>
                  ) : null}
                  <Text className="ml-2 text-base font-bold text-zinc-900 dark:text-zinc-50">{goal.name || 'Sem nome'}</Text>
                </View>

                <RpmLine label="Resultado" value={goal.rpm.result} />
                <RpmLine label="Propósito" value={goal.rpm.purpose} />
                <RpmLine label="Impacto" value={goal.rpm.impact} />

                {goalMetrics.length > 0 ? (
                  <View className="mt-3 border-t pt-3" style={{ borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    {goalMetrics.map((metric) => (
                      <View key={metric.id} className="mt-1 flex-row items-center justify-between">
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">{metric.label}</Text>
                        <MetricSummary metric={metric} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>
    ) : null;

  if (scope === 'secondaryOnly') {
    return <View className="gap-3">{secondaryGoalsCard}</View>;
  }

  return (
    <View className="gap-3">
      <Card title="Ciclo" isDark={isDark}>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-zinc-700 dark:text-zinc-300">
            {formatDate(setup.cycle.startDate)} → {formatDate(setup.cycle.endDate)}
          </Text>
          <Text className="text-sm font-semibold" style={{ color: ACCENT }}>
            {weeks} {weeks === 1 ? 'semana' : 'semanas'}
          </Text>
        </View>
      </Card>

      <Card title="Meta principal" isDark={isDark}>
        <View className="flex-row items-center">
          {MainIcon ? (
            <View className="size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${mainArea?.accent ?? ACCENT}1f` }}>
              <MainIcon size={16} color={mainArea?.accent ?? ACCENT} />
            </View>
          ) : null}
          <Text className="ml-2 text-base font-bold text-zinc-900 dark:text-zinc-50">{setup.mainGoal.name || 'Sem nome'}</Text>
        </View>

        <RpmLine label="Resultado" value={setup.mainGoal.rpm.result} />
        <RpmLine label="Propósito" value={setup.mainGoal.rpm.purpose} />
        <RpmLine label="Impacto" value={setup.mainGoal.rpm.impact} />

        {validMetrics.length > 0 ? (
          <View className="mt-3 border-t pt-3" style={{ borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            {validMetrics.map((metric) => (
              <View key={metric.id} className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">{metric.label}</Text>
                <MetricSummary metric={metric} />
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {secondaryGoalsCard}
    </View>
  );
}
