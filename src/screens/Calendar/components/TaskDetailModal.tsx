import { Check, GoalIcon, TrendingUp, X, Zap } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Task } from '../../NewTask/data';
import { describeFrequency, getFrequencyMeta, getLifeArea, LEVEL_LABELS } from '../../NewTask/data';
import LevelDots from '../../Tasks/components/LevelDots';

type TaskDetailModalProps = {
  visible: boolean;
  task: Task | null;
  isDark: boolean;
  onClose: () => void;
};

type CheckIconProps = {
  done: boolean;
  isDark: boolean;
  accent: string;
};

function CheckIcon({ done, isDark, accent }: CheckIconProps) {
  if (done) {
    return (
      <View className="size-5 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <Check size={12} color="#ffffff" />
      </View>
    );
  }

  return (
    <View
      className="size-4 rounded-full border"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      }}
    />
  );
}

type DetailRowProps = {
  label: string;
  isDark: boolean;
  children: ReactNode;
};

function DetailRow({ label, isDark, children }: DetailRowProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function levelLabel(value: number | undefined): string {
  if (!value || value < 1 || value > 5) return '—';
  return LEVEL_LABELS[value - 1] ?? '—';
}

function frequencyLabel(task: Task): string {
  const described = describeFrequency(task);
  if (described) return described;
  return getFrequencyMeta(task.frequency.kind)?.label ?? '—';
}

export default function TaskDetailModal({ visible, task, isDark, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  const area = getLifeArea(task.area);
  const accent = area?.accent ?? '#71717a';
  const AreaIcon = area?.Icon;
  const FreqIcon = getFrequencyMeta(task.frequency.kind)?.Icon;
  const subtasks = task.subtasks ?? [];
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const panelBackground = isDark ? '#18181b' : '#fafafa';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar detalhes da tarefa" />

        <View className="max-h-[85%] rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: panelBackground }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

          <View className="mb-4 flex-row items-start justify-between">
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">{task.name}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              className="size-8 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <DetailRow label="Energia gasta" isDark={isDark}>
              <View className="flex-row items-center">
                <Zap size={16} color="#22c55e" style={{ marginRight: 8 }} />
                <LevelDots value={task.energy || 0} accent="#22c55e" isDark={isDark} big />
                <Text className="ml-3 text-sm font-medium" style={{ color: mutedColor }}>
                  {levelLabel(task.energy)}
                </Text>
              </View>
            </DetailRow>

            <DetailRow label="Impacto esperado" isDark={isDark}>
              <View className="flex-row items-center">
                <TrendingUp size={16} color="#3b82f6" style={{ marginRight: 8 }} />
                <LevelDots value={task.impact || 0} accent="#3b82f6" isDark={isDark} big />
                <Text className="ml-3 text-sm font-medium" style={{ color: mutedColor }}>
                  {levelLabel(task.impact)}
                </Text>
              </View>
            </DetailRow>

            <DetailRow label="Frequência esperada" isDark={isDark}>
              <View className="flex-row items-center">
                {FreqIcon ? <FreqIcon size={16} color={mutedColor} style={{ marginRight: 8 }} /> : null}
                <Text className="text-sm font-medium" style={{ color: isDark ? '#e4e4e7' : '#3f3f46' }}>
                  {frequencyLabel(task)}
                </Text>
              </View>
            </DetailRow>

            <DetailRow label="Área da vida ou metas" isDark={isDark}>
              <View className="flex-row items-center">
                <View className="mr-3 size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22` }}>
                  {AreaIcon ? <AreaIcon size={18} color={accent} /> : <GoalIcon size={18} color={accent} />}
                </View>
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${accent}22` }}>
                  <Text className="text-sm font-semibold" style={{ color: accent }}>
                    {area?.label || task.area}
                  </Text>
                </View>
              </View>
            </DetailRow>

            {subtasks.length > 0 ? (
              <DetailRow label="Sub-tarefas" isDark={isDark}>
                <View className="rounded-2xl border px-3 py-1" style={{ borderColor: dividerColor }}>
                  {subtasks.map((subtask) => {
                    let subtaskColor = isDark ? '#e4e4e7' : '#3f3f46';
                    if (subtask.done) subtaskColor = mutedColor;

                    return (
                      <View key={subtask.id} className="flex-row items-center py-2.5">
                        <CheckIcon done={subtask.done} isDark={isDark} accent={accent} />
                        <Text className="ml-3 flex-1 text-sm" style={{ color: subtaskColor, textDecorationLine: subtask.done ? 'line-through' : 'none' }}>
                          {subtask.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </DetailRow>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
