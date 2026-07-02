/**
 * # Assistente de voz
 *
 * Overlay full-screen (estilo ChatGPT) que guia a criação de tarefa por voz:
 * intenção → nome → quando → área → confirmação. A interpretação é híbrida:
 * parser local pt-BR primeiro, fallback LLM via backend quando disponível.
 */
import { GoalIcon, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/network';
import { usePendingSync } from '@/lib/pendingSync';
import { llmParseArea, llmParseFrequency } from '@/lib/voice/llmParse';
import { matchArea, matchIntent, parseFrequency } from '@/lib/voice/parse';
import { useSpeechRecognition } from '@/lib/voice/useSpeechRecognition';
import { LIFE_AREAS } from '@/screens/common';
import { useConfigPreferences } from '@/screens/Config/hooks/useConfigPreferences';
import type { FrequencyConfig, Task } from '@/screens/NewTask/data';
import { describeFrequency } from '@/screens/NewTask/data';
import { submitTask } from '@/screens/NewTask/submit';

import { ListeningIndicator } from './components';

export type VoiceTaskDraft = {
  name: string;
  frequency: FrequencyConfig;
  /** Valor salvo no campo `area` da tarefa (id de área da vida ou label de meta). */
  area: string;
  areaLabel: string;
};

type VoiceStep = 'intent' | 'name' | 'when' | 'area' | 'confirm';

const STEP_PROMPTS: Record<VoiceStep, string> = {
  intent: 'O que você deseja?',
  name: 'Qual o nome da tarefa?',
  when: 'Quando a tarefa será feita?',
  area: 'Qual área é a sua tarefa?',
  confirm: 'Confirme os dados',
};

const DEFAULT_GOAL_LABELS = ['SAÚDE', 'FLOWLY'];

type VoiceAssistantProps = {
  visible: boolean;
  onClose: () => void;
  /** Abre a tela NewTask pré-preenchida com o rascunho ditado. */
  onEdit: (draft: VoiceTaskDraft) => void;
  /** Tarefa salva (ou enfileirada) com sucesso. */
  onCreated: () => void;
};

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

type AreaOptionsProps = {
  isDark: boolean;
  goalLabels: string[];
  onSelect: (label: string) => void;
};

/** Lista de opções faláveis do passo de área. Tocar numa opção também seleciona. */
function AreaOptions({ isDark, goalLabels, onSelect }: AreaOptionsProps) {
  return (
    <ScrollView className="mt-6 max-h-72 self-stretch" showsVerticalScrollIndicator={false}>
      <View className="flex-row flex-wrap justify-center">
        {goalLabels.map((label) => (
          <Pressable
            key={`goal-${label}`}
            onPress={() => onSelect(label)}
            accessibilityRole="button"
            className="m-1 flex-row items-center rounded-full border px-3 py-2 active:opacity-70"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' }}
          >
            <GoalIcon size={14} color="#22c55e" />
            <Text className="ml-1.5 text-sm text-zinc-700 dark:text-zinc-200">{label}</Text>
          </Pressable>
        ))}
        {LIFE_AREAS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.label)}
            accessibilityRole="button"
            className="m-1 flex-row items-center rounded-full border px-3 py-2 active:opacity-70"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' }}
          >
            <item.Icon size={14} color={item.accent} />
            <Text className="ml-1.5 text-sm text-zinc-700 dark:text-zinc-200">{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

type ConfirmStepProps = {
  isDark: boolean;
  name: string;
  frequency: FrequencyConfig;
  areaValue: string;
  areaLabel: string;
  submitting: boolean;
  onConfirm: () => void;
  onEdit: () => void;
};

function ConfirmStep({ isDark, name, frequency, areaValue, areaLabel, submitting, onConfirm, onEdit }: ConfirmStepProps) {
  const lifeArea = LIFE_AREAS.find((item) => item.id === areaValue);
  const AreaIcon = lifeArea?.Icon ?? GoalIcon;
  const areaAccent = lifeArea?.accent ?? '#22c55e';
  const whenLabel = describeFrequency({ frequency } as Task) || 'Sem data definida';

  const rows = [
    { key: 'name', label: 'Nome', value: name },
    { key: 'when', label: 'Quando', value: whenLabel },
  ];

  return (
    <View className="flex-1 px-6 pb-10">
      <View className="flex-1 justify-center">
        <Text className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">Confirme sua tarefa</Text>
        <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">Revise os dados antes de concluir.</Text>

        <View className="mt-8 rounded-3xl border p-5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
          {rows.map((row) => (
            <View key={row.key} className="mb-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{row.label}</Text>
              <Text className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{row.value}</Text>
            </View>
          ))}
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Área</Text>
            <View className="mt-1 flex-row items-center">
              <AreaIcon size={18} color={areaAccent} />
              <Text className="ml-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{lifeArea?.label ?? areaLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <Pressable onPress={onConfirm} disabled={submitting} accessibilityRole="button" accessibilityState={{ disabled: submitting }} className="active:opacity-80">
        <View className="items-center rounded-2xl py-3.5" style={{ backgroundColor: isDark ? '#fafafa' : '#6366f1' }}>
          {submitting ? (
            <ActivityIndicator color={isDark ? '#18181b' : '#ffffff'} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: isDark ? '#18181b' : '#ffffff' }}>
              Concluir
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable onPress={onEdit} disabled={submitting} accessibilityRole="button" className="mt-3 active:opacity-70">
        <View className="items-center rounded-2xl border py-3.5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(99,102,241,0.4)' }}>
          <Text className="text-base font-semibold" style={{ color: isDark ? '#e4e4e7' : '#6366f1' }}>
            Editar
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function VoiceAssistant({ visible, onClose, onEdit, onCreated }: VoiceAssistantProps) {
  const isDark = useColorScheme() === 'dark';
  const { enqueue } = usePendingSync();
  const { preferences } = useConfigPreferences();

  const [step, setStep] = useState<VoiceStep>('intent');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<FrequencyConfig | null>(null);
  const [area, setArea] = useState<{ value: string; label: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [goalLabels, setGoalLabels] = useState<string[]>(DEFAULT_GOAL_LABELS);

  // Refs para os handlers de fala lerem o estado atual sem re-assinar listeners.
  const stepRef = useRef(step);
  stepRef.current = step;
  const goalLabelsRef = useRef(goalLabels);
  goalLabelsRef.current = goalLabels;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const advance = useCallback((next: VoiceStep) => {
    setHint(null);
    setStep(next);
  }, []);

  const handleFinalTranscript = useCallback(
    async (transcript: string) => {
      if (!visibleRef.current) return;
      const text = transcript.trim();
      const currentStep = stepRef.current;

      if (!text) {
        setHint('Não ouvi nada. Toque no microfone para tentar de novo.');
        return;
      }

      if (currentStep === 'intent') {
        if (matchIntent(text)) {
          advance('name');
        } else {
          setHint('Não entendi. Por enquanto, você pode dizer "Criar tarefa".');
        }
        return;
      }

      if (currentStep === 'name') {
        setName(capitalize(text));
        advance('when');
        return;
      }

      if (currentStep === 'when') {
        let parsed = parseFrequency(text);
        if (!parsed) {
          setProcessing(true);
          parsed = await llmParseFrequency(text);
          setProcessing(false);
        }
        if (parsed) {
          setFrequency(parsed);
          advance('area');
        } else {
          setHint('Não entendi a data. Tente algo como "hoje às 2 da tarde", "toda segunda-feira" ou "sem data definida".');
        }
        return;
      }

      if (currentStep === 'area') {
        let parsed = matchArea(text, goalLabelsRef.current);
        if (!parsed) {
          const options = [...goalLabelsRef.current.map((label) => ({ value: label, label })), ...LIFE_AREAS.map((item) => ({ value: item.id, label: item.label }))];
          setProcessing(true);
          parsed = await llmParseArea(text, options);
          setProcessing(false);
        }
        if (parsed) {
          setArea(parsed);
          advance('confirm');
        } else {
          setHint('Não reconheci essa área. Diga uma das opções da tela.');
        }
      }
    },
    [advance],
  );

  const handleSpeechError = useCallback((code: string) => {
    if (!visibleRef.current) return;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      Alert.alert('Microfone desativado', 'Para criar tarefas por voz, permita o acesso ao microfone nos ajustes do sistema.', [
        { text: 'Abrir ajustes', onPress: () => Linking.openSettings().catch(() => undefined) },
        { text: 'Agora não', style: 'cancel' },
      ]);
      return;
    }
    if (code === 'no-speech' || code === 'nomatch') {
      setHint('Não ouvi nada. Toque no microfone para tentar de novo.');
      return;
    }
    if (code !== 'aborted') {
      setHint('Algo deu errado com o microfone. Toque para tentar de novo.');
    }
  }, []);

  const { listening, transcript, start, abort } = useSpeechRecognition({ onFinal: handleFinalTranscript, onError: handleSpeechError });

  // Reinicia o assistente e busca as metas ao abrir.
  useEffect(() => {
    if (!visible) return;
    setStep('intent');
    setName('');
    setFrequency(null);
    setArea(null);
    setHint(null);
    setProcessing(false);
    setSubmitting(false);

    api
      .get<string[]>(`/goals/labels`)
      .then((labels) => {
        if (Array.isArray(labels) && labels.length > 0) setGoalLabels(labels);
      })
      .catch(() => undefined); // mantém os labels padrão
  }, [visible]);

  // Escuta automática ao entrar em cada passo falado (a animação do modal
  // termina antes do microfone abrir).
  useEffect(() => {
    if (!visible || step === 'confirm') return undefined;
    const timer = setTimeout(() => {
      start();
    }, 600);
    return () => clearTimeout(timer);
  }, [visible, step, start]);

  const handleClose = () => {
    abort();
    onClose();
  };

  const handleConfirm = async () => {
    if (submitting || !frequency || !area || !name) return;
    setSubmitting(true);
    try {
      const result = await submitTask({ name, description: '', energy: 3, impact: 3, frequency, area: area.value, subtasks: [], estimatedMinutes: null }, { enqueue, remindersEnabled: preferences.taskRemindersEnabled ?? true });
      if (result === 'retry') return;
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!frequency || !area) return;
    abort();
    onEdit({ name, frequency, area: area.value, areaLabel: area.label });
  };

  const dimText = isDark ? '#52525b' : '#a1a1aa';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-white dark:bg-black">
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-row items-center justify-end px-4 pt-2">
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar assistente"
              className="size-10 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <X size={20} color={isDark ? '#e4e4e7' : '#3f3f46'} />
            </Pressable>
          </View>

          {step === 'confirm' && frequency && area ? (
            <ConfirmStep isDark={isDark} name={name} frequency={frequency} areaValue={area.value} areaLabel={area.label} submitting={submitting} onConfirm={handleConfirm} onEdit={handleEdit} />
          ) : (
            <View className="flex-1 items-center justify-between px-6 pb-10">
              <View className="flex-1 items-center justify-center">
                <Text className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">{STEP_PROMPTS[step]}</Text>

                {step === 'intent' ? (
                  <Pressable
                    onPress={() => {
                      abort();
                      advance('name');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Criar tarefa"
                    className="mt-6 active:opacity-60"
                  >
                    <Text className="text-center text-xl font-semibold" style={{ color: dimText }}>
                      &ldquo;Criar tarefa&rdquo;
                    </Text>
                  </Pressable>
                ) : null}

                {step === 'area' ? (
                  <AreaOptions
                    isDark={isDark}
                    goalLabels={goalLabels}
                    onSelect={(selected) => {
                      abort();
                      handleFinalTranscript(selected);
                    }}
                  />
                ) : null}

                {transcript && listening ? (
                  <Text className="mt-6 text-center text-base text-zinc-500 dark:text-zinc-400" numberOfLines={3}>
                    {transcript}
                  </Text>
                ) : null}

                {hint ? (
                  <Text className="mt-6 text-center text-sm" style={{ color: '#f97316' }}>
                    {hint}
                  </Text>
                ) : null}
              </View>

              <ListeningIndicator listening={listening} processing={processing} isDark={isDark} onPress={start} />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
