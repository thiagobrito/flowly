import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { LIFE_AREAS } from '@/screens/common';

import type { ExecutionTrend, Goal, GoalHealth, GoalMetric, GoalStatus, GoalTypeKind } from '../data';
import { createEmptyHealth, createEmptyMetric, HEALTH_DOT_COLOR, HEALTH_LEVEL_CYCLE, STATUS_OPTIONS, TREND_OPTIONS, TYPE_OPTIONS } from '../data';

type GoalEditorProps = {
  goal: Goal;
  isNew: boolean;
  isDark: boolean;
  onCancel: () => void;
  onSave: (goal: Goal) => void;
  onDelete?: () => void;
};

const ACCENT = '#3b82f6';

function optionBorder(selected: boolean, accent: string, isDark: boolean) {
  if (selected) return accent;
  return isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
}

function optionText(selected: boolean, accent: string, isDark: boolean) {
  if (selected) return accent;
  return isDark ? '#d4d4d8' : '#52525b';
}

function optionIcon(selected: boolean, accent: string, isDark: boolean) {
  if (selected) return accent;
  return isDark ? '#a1a1aa' : '#71717a';
}

function inputStyle(isDark: boolean) {
  return {
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{children}</Text>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">{children}</Text>;
}

function Segmented<T extends string>({ options, value, onChange, isDark }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; isDark: boolean }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="rounded-full border px-3.5 py-2 active:opacity-80"
            style={{
              borderColor: optionBorder(selected, ACCENT, isDark),
              backgroundColor: selected ? `${ACCENT}22` : 'transparent',
            }}
          >
            <Text className="text-sm font-medium" style={{ color: optionText(selected, ACCENT, isDark) }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NumberField({ label, value, onChange, isDark, suffix }: { label: string; value: number; onChange: (value: number) => void; isDark: boolean; suffix?: string }) {
  return (
    <View className="flex-1">
      <FieldLabel>{label}</FieldLabel>
      <View className="flex-row items-center rounded-xl border px-3" style={inputStyle(isDark)}>
        <TextInput
          value={String(value)}
          onChangeText={(text) => {
            const numeric = Number(text.replace(/[^0-9.]/g, ''));
            onChange(Number.isNaN(numeric) ? 0 : numeric);
          }}
          keyboardType="numeric"
          placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
          className="flex-1 py-2.5 text-[15px] text-zinc-900 dark:text-zinc-50"
        />
        {suffix ? <Text className="ml-1 text-sm text-zinc-400 dark:text-zinc-500">{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function GoalEditor({ goal, isNew, isDark, onCancel, onSave, onDelete }: GoalEditorProps) {
  const [draft, setDraft] = useState<Goal>(goal);

  const update = <K extends keyof Goal>(key: K, value: Goal[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  const updateRpm = (key: keyof Goal['rpm'], value: string) => setDraft((prev) => ({ ...prev, rpm: { ...prev.rpm, [key]: value } }));

  const updateMetric = (id: string, patch: Partial<GoalMetric>) => setDraft((prev) => ({ ...prev, metrics: prev.metrics.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)) }));
  const addMetric = () => setDraft((prev) => ({ ...prev, metrics: [...prev.metrics, createEmptyMetric()] }));
  const removeMetric = (id: string) => setDraft((prev) => ({ ...prev, metrics: prev.metrics.filter((metric) => metric.id !== id) }));

  const addHealth = () => setDraft((prev) => ({ ...prev, health: [...prev.health, createEmptyHealth()] }));
  const updateHealth = (id: string, patch: Partial<GoalHealth>) => setDraft((prev) => ({ ...prev, health: prev.health.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  const cycleHealthLevel = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      health: prev.health.map((item) => {
        if (item.id !== id) return item;
        const next = HEALTH_LEVEL_CYCLE[(HEALTH_LEVEL_CYCLE.indexOf(item.level) + 1) % HEALTH_LEVEL_CYCLE.length] ?? 'green';
        return { ...item, level: next };
      }),
    }));
  const removeHealth = (id: string) => setDraft((prev) => ({ ...prev, health: prev.health.filter((item) => item.id !== id) }));

  const canSave = draft.name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      Alert.alert('Nome obrigatório', 'Dê um nome para a meta antes de salvar.');
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      metrics: draft.metrics.filter((metric) => metric.label.trim().length > 0).map((metric) => ({ ...metric, label: metric.label.trim() })),
      health: draft.health.filter((item) => item.label.trim().length > 0).map((item) => ({ ...item, label: item.label.trim() })),
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Excluir meta', 'Tem certeza que deseja excluir esta meta? Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ]);
  };

  const placeholderColor = isDark ? '#71717a' : '#a1a1aa';
  const textInputClass = 'rounded-xl border px-3 py-2.5 text-[15px] text-zinc-900 dark:text-zinc-50';

  return (
    <View className="flex-1">
      <View className="flex-row items-center pt-2">
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Voltar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-80 dark:bg-white/10">
          <ChevronLeft size={22} color={isDark ? '#e4e4e7' : '#27272a'} />
        </Pressable>
        <Text className="ml-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{isNew ? 'Nova meta' : 'Editar meta'}</Text>
      </View>

      <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Nome */}
        <SectionLabel>Nome da meta</SectionLabel>
        <TextInput value={draft.name} onChangeText={(name) => update('name', name)} placeholder="Ex.: Reduzir gordura para 15%" placeholderTextColor={placeholderColor} className={textInputClass} style={inputStyle(isDark)} />

        {/* Área */}
        <SectionLabel>Área da vida</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {LIFE_AREAS.map((area) => {
            const selected = area.id === draft.areaId;
            const AreaIcon = area.Icon;
            return (
              <Pressable
                key={area.id}
                onPress={() => update('areaId', area.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-80"
                style={{ borderColor: optionBorder(selected, area.accent, isDark), backgroundColor: selected ? `${area.accent}22` : 'transparent' }}
              >
                <AreaIcon size={14} color={optionIcon(selected, area.accent, isDark)} />
                <Text className="text-sm font-medium" style={{ color: optionText(selected, area.accent, isDark) }}>
                  {area.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tipo e Status */}
        <SectionLabel>Tipo</SectionLabel>
        <Segmented options={TYPE_OPTIONS} value={draft.type} onChange={(value: GoalTypeKind) => update('type', value)} isDark={isDark} />

        <SectionLabel>Status</SectionLabel>
        <Segmented options={STATUS_OPTIONS} value={draft.status} onChange={(value: GoalStatus) => update('status', value)} isDark={isDark} />

        {/* RPM */}
        <SectionLabel>RPM</SectionLabel>
        <FieldLabel>Resultado</FieldLabel>
        <TextInput
          value={draft.rpm.result}
          onChangeText={(text) => updateRpm('result', text)}
          placeholder="Qual resultado você busca?"
          placeholderTextColor={placeholderColor}
          multiline
          className={`min-h-[60px] ${textInputClass}`}
          style={[inputStyle(isDark), { textAlignVertical: 'top' }]}
        />
        <View className="mt-2.5">
          <FieldLabel>Propósito</FieldLabel>
          <TextInput
            value={draft.rpm.purpose}
            onChangeText={(text) => updateRpm('purpose', text)}
            placeholder="Por que isso é importante?"
            placeholderTextColor={placeholderColor}
            multiline
            className={`min-h-[60px] ${textInputClass}`}
            style={[inputStyle(isDark), { textAlignVertical: 'top' }]}
          />
        </View>
        <View className="mt-2.5">
          <FieldLabel>Impacto</FieldLabel>
          <TextInput
            value={draft.rpm.impact}
            onChangeText={(text) => updateRpm('impact', text)}
            placeholder="O que muda ao alcançar?"
            placeholderTextColor={placeholderColor}
            multiline
            className={`min-h-[60px] ${textInputClass}`}
            style={[inputStyle(isDark), { textAlignVertical: 'top' }]}
          />
        </View>

        {/* Progresso e ciclo */}
        <SectionLabel>Progresso e ciclo</SectionLabel>
        <View className="flex-row gap-3">
          <NumberField label="Progresso" value={draft.progress} onChange={(value) => update('progress', Math.min(100, value))} isDark={isDark} suffix="%" />
          <NumberField label="Dias restantes" value={draft.daysRemaining} onChange={(value) => update('daysRemaining', value)} isDark={isDark} />
        </View>
        <View className="mt-3 flex-row gap-3">
          <NumberField label="Semanas feitas" value={draft.weeksCompleted} onChange={(value) => update('weeksCompleted', value)} isDark={isDark} />
          <NumberField label="Total de semanas" value={draft.totalWeeks} onChange={(value) => update('totalWeeks', value)} isDark={isDark} />
        </View>

        {/* Métricas */}
        <SectionLabel>Métricas</SectionLabel>
        <View className="gap-3">
          {draft.metrics.map((metric) => (
            <View key={metric.id} className="rounded-2xl border p-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)' }}>
              <View className="flex-row items-center gap-2">
                <TextInput value={metric.label} onChangeText={(label) => updateMetric(metric.id, { label })} placeholder="Nome da métrica" placeholderTextColor={placeholderColor} className={`flex-1 ${textInputClass}`} style={inputStyle(isDark)} />
                <Pressable
                  onPress={() => removeMetric(metric.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Remover métrica"
                  className="size-9 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}
                >
                  <Trash2 size={15} color="#ef4444" />
                </Pressable>
              </View>
              <View className="mt-2.5 flex-row gap-3">
                <NumberField label="Atual" value={metric.current} onChange={(value) => updateMetric(metric.id, { current: value })} isDark={isDark} />
                <NumberField label="Alvo" value={metric.target} onChange={(value) => updateMetric(metric.id, { target: value })} isDark={isDark} />
              </View>
              <View className="mt-2.5">
                <FieldLabel>Unidade</FieldLabel>
                <TextInput value={metric.unit} onChangeText={(unit) => updateMetric(metric.id, { unit })} placeholder="Ex.: %, kg, R$" placeholderTextColor={placeholderColor} className={textInputClass} style={inputStyle(isDark)} />
              </View>
            </View>
          ))}
        </View>
        <Pressable
          onPress={addMetric}
          accessibilityRole="button"
          className="mt-3 flex-row items-center justify-center rounded-2xl border px-4 py-3 active:opacity-80"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}
        >
          <Plus size={16} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          <Text className="ml-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Adicionar métrica</Text>
        </Pressable>

        {/* Momentum */}
        <SectionLabel>Momentum</SectionLabel>
        <View className="flex-row gap-3">
          <NumberField label="Consistência" value={draft.consistencyScore} onChange={(value) => update('consistencyScore', Math.min(100, value))} isDark={isDark} suffix="%" />
          <NumberField label="Sequência (sem.)" value={draft.weeklyStreak} onChange={(value) => update('weeklyStreak', value)} isDark={isDark} />
        </View>
        <View className="mt-3">
          <FieldLabel>Tendência de execução</FieldLabel>
          <Segmented options={TREND_OPTIONS} value={draft.trend} onChange={(value: ExecutionTrend) => update('trend', value)} isDark={isDark} />
        </View>

        {/* Confiança */}
        <SectionLabel>Confiança (1–10)</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, index) => {
            const value = index + 1;
            const selected = draft.confidence === value;
            return (
              <Pressable
                key={value}
                onPress={() => update('confidence', value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="size-10 items-center justify-center rounded-xl border active:opacity-80"
                style={{ borderColor: optionBorder(selected, ACCENT, isDark), backgroundColor: selected ? `${ACCENT}22` : 'transparent' }}
              >
                <Text className="text-sm font-semibold" style={{ color: optionText(selected, ACCENT, isDark) }}>
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Saúde da meta */}
        <SectionLabel>Saúde da meta</SectionLabel>
        <View className="gap-2">
          {draft.health.map((item) => (
            <View key={item.id} className="flex-row items-center gap-2">
              <Pressable
                onPress={() => cycleHealthLevel(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Alterar nível"
                className="size-9 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: `${HEALTH_DOT_COLOR[item.level]}22` }}
              >
                <View className="size-3.5 rounded-full" style={{ backgroundColor: HEALTH_DOT_COLOR[item.level] }} />
              </Pressable>
              <TextInput
                value={item.label}
                onChangeText={(label) => updateHealth(item.id, { label })}
                placeholder="Ex.: Hábitos consistentes"
                placeholderTextColor={placeholderColor}
                className={`flex-1 ${textInputClass}`}
                style={inputStyle(isDark)}
              />
              <Pressable
                onPress={() => removeHealth(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Remover diagnóstico"
                className="size-9 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}
              >
                <Trash2 size={15} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable
          onPress={addHealth}
          accessibilityRole="button"
          className="mt-3 flex-row items-center justify-center rounded-2xl border px-4 py-3 active:opacity-80"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}
        >
          <Plus size={16} color={isDark ? '#e4e4e7' : '#3f3f46'} />
          <Text className="ml-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Adicionar diagnóstico</Text>
        </Pressable>

        {/* Ações */}
        <Pressable onPress={handleSave} disabled={!canSave} accessibilityRole="button" className="mt-6 items-center rounded-2xl py-3.5 active:opacity-85" style={{ backgroundColor: ACCENT, opacity: canSave ? 1 : 0.4 }}>
          <Text className="text-base font-semibold text-white">Salvar meta</Text>
        </Pressable>

        {onDelete ? (
          <Pressable onPress={handleDelete} accessibilityRole="button" className="mt-3 flex-row items-center justify-center rounded-2xl border px-4 py-3.5 active:opacity-80" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
            <Trash2 size={16} color="#ef4444" />
            <Text className="ml-2 text-base font-semibold text-red-500">Excluir meta</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
