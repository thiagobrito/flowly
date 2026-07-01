import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { GetLifeArea } from '@/screens/common';

import type { Goal } from '../data';
import { STATUS_LABELS, TYPE_LABELS } from '../data';
import ConfidenceMeter from './ConfidenceMeter';
import GoalCompletedTasksTable from './GoalCompletedTasksTable';
import HealthDiagnostics from './HealthDiagnostics';
import MetricRow from './MetricRow';
import MomentumCard from './MomentumCard';
import ProgressOverview from './ProgressOverview';
import RpmSection from './RpmSection';

type GoalCardProps = {
  goal: Goal;
  isDark: boolean;
  onEdit?: () => void;
};

const STATUS_COLOR: Record<Goal['status'], string> = {
  active: '#22c55e',
  completed: '#3b82f6',
  paused: '#eab308',
  archived: '#a1a1aa',
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}22` }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{children}</Text>;
}

function Divider({ isDark }: { isDark: boolean }) {
  return <View className="my-4 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />;
}

export default function GoalCard({ goal, isDark, onEdit }: GoalCardProps) {
  const area = GetLifeArea(goal.areaId);
  const accent = area?.accent ?? '#3b82f6';
  const AreaIcon = area?.Icon;

  return (
    <View
      className="rounded-3xl p-5"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 size-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}22` }}>
          {AreaIcon ? <AreaIcon size={20} color={accent} /> : null}
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-50">{goal.name}</Text>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            <Chip label={TYPE_LABELS[goal.type]} color={goal.type === 'primary' ? '#6366f1' : '#a855f7'} />
            <Chip label={STATUS_LABELS[goal.status]} color={STATUS_COLOR[goal.status]} />
            {area ? <Chip label={area.label} color={accent} /> : null}
          </View>
        </View>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Editar meta ${goal.name}`}
            className="size-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
          >
            <Pencil size={16} color={isDark ? '#a1a1aa' : '#52525b'} />
          </Pressable>
        ) : null}
      </View>

      <Divider isDark={isDark} />

      {/* Progresso */}
      <SectionLabel>Progresso</SectionLabel>
      <ProgressOverview progress={goal.progress} daysRemaining={goal.daysRemaining} weeksCompleted={goal.weeksCompleted} totalWeeks={goal.totalWeeks} isDark={isDark} accent={accent} points={goal.points} />

      <Divider isDark={isDark} />

      {/* RPM */}
      <SectionLabel>RPM</SectionLabel>
      <RpmSection rpm={goal.rpm} />

      {goal.metrics.length > 0 ? (
        <>
          <Divider isDark={isDark} />
          <SectionLabel>Métricas</SectionLabel>
          <View className="gap-3.5">
            {goal.metrics.map((metric) => (
              <MetricRow key={metric.id} metric={metric} isDark={isDark} accent={accent} />
            ))}
          </View>
        </>
      ) : null}

      <Divider isDark={isDark} />

      <SectionLabel>Tarefas realizadas</SectionLabel>
      <GoalCompletedTasksTable goal={goal} isDark={isDark} accent={accent} />

      <Divider isDark={isDark} />

      {/* Momentum */}
      <SectionLabel>Momentum</SectionLabel>
      <MomentumCard consistencyScore={goal.consistencyScore} weeklyStreak={goal.weeklyStreak} trend={goal.trend} />

      <Divider isDark={isDark} />

      {/* Confiança */}
      <ConfidenceMeter confidence={goal.confidence} isDark={isDark} />

      {goal.health.length > 0 ? (
        <>
          <Divider isDark={isDark} />
          <SectionLabel>Saúde da meta</SectionLabel>
          <HealthDiagnostics health={goal.health} />
        </>
      ) : null}
    </View>
  );
}
