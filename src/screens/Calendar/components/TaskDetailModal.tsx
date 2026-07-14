import { FileText, GoalIcon, TrendingUp, X, Zap } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { SubtaskEditor } from '../../NewTask/components';
import type { Subtask, Task } from '../../NewTask/data';
import { describeFrequency, getFrequencyMeta, getLifeArea, LEVEL_LABELS } from '../../NewTask/data';
import LevelDots from '../../Tasks/components/LevelDots';

type TaskDetailModalProps = {
  visible: boolean;
  task: Task | null;
  isDark: boolean;
  onClose: () => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onSaveSubtasks: (task: Task, nextSubtasks: Subtask[]) => void;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
};

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

export default function TaskDetailModal({ visible, task, isDark, onClose, onToggleSubtask, onSaveSubtasks, onEdit, onComplete }: TaskDetailModalProps) {
  if (!task) return null;

  const area = getLifeArea(task.goal.name);
  const accent = area?.accent ?? '#71717a';
  const AreaIcon = area?.Icon;
  const FreqIcon = getFrequencyMeta(task.frequency.kind)?.Icon;
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const panelBackground = isDark ? '#18181b' : '#fafafa';
  const secondaryButtonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const completeDisabled = !!task.done;

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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {task.description ? (
              <DetailRow label="Descrição" isDark={isDark}>
                <View className="flex-row items-start">
                  <FileText size={16} color={mutedColor} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text className="flex-1 text-sm" style={{ color: isDark ? '#e4e4e7' : '#3f3f46' }}>
                    {task.description}
                  </Text>
                </View>
              </DetailRow>
            ) : null}

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
                    {area?.label || task?.area}
                  </Text>
                </View>
              </View>
            </DetailRow>

            <DetailRow label="Sub-tarefas" isDark={isDark}>
              <SubtaskEditor value={task.subtasks ?? []} onChange={(next) => onSaveSubtasks(task, next)} onToggle={(subtask) => onToggleSubtask(task, subtask.id)} accent={accent} isDark={isDark} />
            </DetailRow>
          </ScrollView>

          <View className="mt-3 flex-row gap-3 border-t pt-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <Pressable onPress={() => onEdit(task)} accessibilityRole="button" accessibilityLabel="Editar tarefa" className="flex-1 items-center justify-center rounded-2xl py-3.5 active:opacity-80" style={{ backgroundColor: secondaryButtonBg }}>
              <Text className="text-sm font-semibold" style={{ color: isDark ? '#e4e4e7' : '#3f3f46' }}>
                Editar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onComplete(task)}
              disabled={completeDisabled}
              accessibilityRole="button"
              accessibilityLabel={completeDisabled ? 'Tarefa concluída' : 'Concluir tarefa'}
              accessibilityState={{ disabled: completeDisabled }}
              className="flex-1 items-center justify-center rounded-2xl py-3.5 active:opacity-80"
              style={{ backgroundColor: completeDisabled ? secondaryButtonBg : accent, opacity: completeDisabled ? 0.7 : 1 }}
            >
              <Text className="text-sm font-semibold" style={{ color: completeDisabled ? mutedColor : '#ffffff' }}>
                {completeDisabled ? 'Concluída' : 'Concluir tarefa'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
