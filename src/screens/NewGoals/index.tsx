import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { api } from '@/lib/network';
import { usePendingSync } from '@/lib/pendingSync';
import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';
import type { Goal, GoalSetup } from '@/screens/Goals/data';
import { createEmptyGoalSetup, secondarySetupToGoal } from '@/screens/Goals/data';

import DateRangeStep from './components/DateRangeStep';
import IntroStep from './components/IntroStep';
import LifeAreaMultiStep from './components/LifeAreaMultiStep';
import LifeAreaStep from './components/LifeAreaStep';
import MetricsStep from './components/MetricsStep';
import NavFooter from './components/NavFooter';
import ProgressHeader from './components/ProgressHeader';
import ReviewStep from './components/ReviewStep';
import StepShell from './components/StepShell';
import TextStep from './components/TextStep';
import type { AnamnesisStep } from './data';
import { ANAMNESIS_STEPS, buildAddSecondarySteps, buildAnamnesisSteps, createEmptyMetric, getSecondaryTextValue, getTextValue, isStepComplete, setSecondaryTextValue, setTextValue } from './data';

type NewGoalsProps = {
  isDark: boolean;
  mode?: 'full' | 'addSecondary';
  existingGoals?: Goal[];
  onComplete?: (setup: GoalSetup) => void;
  onClose?: () => void;
};

function initialSetup(mode: 'full' | 'addSecondary'): GoalSetup {
  const setup = createEmptyGoalSetup();
  if (mode === 'addSecondary') {
    return { ...setup, secondaryGoals: [] };
  }
  return { ...setup, mainGoal: { ...setup.mainGoal, metrics: [createEmptyMetric()] } };
}

/**
 * Rascunho da anamnese persistido em storage: se o app for fechado/morto no
 * meio do questionário (o trecho mais longo do onboarding), o usuário retoma
 * do passo em que parou com as respostas preservadas. Limpo ao concluir.
 * Aplica-se apenas ao fluxo completo — `addSecondary` é curto e pós-onboarding.
 */
type NewGoalsDraft = PersistedRecord & {
  index: number;
  setup: GoalSetup | null;
  loaded?: boolean;
  lastUpdate?: string;
};

const DRAFT_KEY = 'new_goals_draft_v1';

const EMPTY_DRAFT: NewGoalsDraft = { index: 0, setup: null };

export default function NewGoals({ isDark, mode = 'full', existingGoals = [], onComplete, onClose }: NewGoalsProps) {
  const isAddSecondary = mode === 'addSecondary';
  const [baseSteps, setBaseSteps] = useState<AnamnesisStep[]>(ANAMNESIS_STEPS);
  const [index, setIndex] = useState(0);
  const [setup, setSetup] = useState<GoalSetup>(() => initialSetup(mode));
  const [submitting, setSubmitting] = useState(false);
  const { enqueue } = usePendingSync();

  const [draft, setDraft] = usePersistedState<NewGoalsDraft>(EMPTY_DRAFT, DRAFT_KEY);
  const [draftRestored, setDraftRestored] = useState(isAddSecondary);
  const draftRestoreRef = useRef(false);

  // Restaura o rascunho salvo (uma vez, após a hidratação do storage).
  useEffect(() => {
    if (isAddSecondary || draftRestoreRef.current || !draft.loaded) return;
    draftRestoreRef.current = true;
    if (draft.setup) {
      setSetup(draft.setup);
      setIndex(Math.max(0, draft.index));
    }
    setDraftRestored(true);
  }, [isAddSecondary, draft.loaded, draft.setup, draft.index]);

  // Persiste cada resposta/avanço para retomar se o app for fechado no meio.
  useEffect(() => {
    if (isAddSecondary || !draftRestored) return;
    setDraft({ index, setup });
  }, [isAddSecondary, draftRestored, index, setup, setDraft]);

  const clearDraft = useCallback(() => {
    if (!isAddSecondary) setDraft({ ...EMPTY_DRAFT });
  }, [isAddSecondary, setDraft]);

  useEffect(() => {
    if (isAddSecondary) return undefined;

    let active = true;
    async function fetchSteps() {
      try {
        const remote = await api.get<AnamnesisStep[]>('/goals/anamnesis');
        if (active && Array.isArray(remote) && remote.length > 0) setBaseSteps(remote);
      } catch {
        // mantém o roteiro padrão quando o backend não responde
      }
    }
    fetchSteps();
    return () => {
      active = false;
    };
  }, [isAddSecondary]);

  const steps = useMemo(() => {
    if (isAddSecondary) return buildAddSecondarySteps(setup.secondaryGoals);
    return buildAnamnesisSteps(baseSteps, setup.secondaryGoals);
  }, [isAddSecondary, baseSteps, setup.secondaryGoals]);

  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;
  const complete = useMemo(() => (step ? isStepComplete(step, setup) : false), [step, setup]);

  const goBack = useCallback(() => setIndex((prev) => Math.max(0, prev - 1)), []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    const pending: { method: 'POST' | 'PUT'; path: string; payload: unknown } | null = (() => {
      if (!isAddSecondary) return { method: 'POST', path: '/goals/anamnesis', payload: setup };
      const secondary = setup.secondaryGoals[0];
      const primary = existingGoals.find((goal) => goal.type === 'primary');
      if (!secondary || !primary) return null;
      return { method: 'PUT', path: '/goals', payload: secondarySetupToGoal(secondary, primary) };
    })();

    try {
      if (pending) {
        if (pending.method === 'POST') await api.post(pending.path, pending.payload);
        else await api.put(pending.path, pending.payload);
      }
    } catch {
      // Não descarta silenciosamente o trabalho do usuário: oferece retry
      // explícito e, se o usuário seguir, guarda a escrita na fila de
      // sincronização pendente para reenvio automático.
      setSubmitting(false);
      Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente novamente. Se preferir, seguimos agora e sincronizamos assim que a conexão voltar.', [
        { text: 'Tentar novamente', onPress: () => submit() },
        {
          text: 'Salvar depois e continuar',
          onPress: () => {
            if (pending) enqueue(pending.method, pending.path, pending.payload);
            clearDraft();
            onComplete?.(setup);
          },
        },
      ]);
      return;
    }
    setSubmitting(false);
    clearDraft();
    onComplete?.(setup);
  }, [isAddSecondary, setup, existingGoals, onComplete, enqueue, clearDraft]);

  const goNext = useCallback(() => {
    if (isLast) {
      submit();
      return;
    }
    setIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }, [isLast, steps.length, submit]);

  const handleSecondaryAreaChange = useCallback((areaId: string) => {
    setSetup((prev) => ({
      ...prev,
      secondaryGoals: [{ label: areaId, name: '', rpm: { result: '', purpose: '', impact: '' }, metrics: [createEmptyMetric()] }],
    }));
  }, []);

  // Aguarda a restauração do rascunho para não piscar o primeiro passo antes
  // de retomar de onde o usuário parou.
  if (!step || !draftRestored) return null;

  let footerLabel = 'Continuar';
  if (isLast) footerLabel = isAddSecondary ? 'Adicionar meta' : 'Criar meu ciclo';
  else if (step.kind === 'intro') footerLabel = 'Começar';
  const showSkip = !isAddSecondary && step.kind === 'lifeAreaMulti';

  const renderStep = () => {
    const { secondaryIndex } = step;

    switch (step.kind) {
      case 'intro':
        return <IntroStep isDark={isDark} total={steps.length} />;
      case 'dateRange':
        return <DateRangeStep startDate={setup.cycle.startDate} endDate={setup.cycle.endDate} isDark={isDark} onChange={(cycle) => setSetup((prev) => ({ ...prev, cycle }))} />;
      case 'lifeArea':
        return <LifeAreaStep value={setup.mainGoal.label} isDark={isDark} onChange={(label) => setSetup((prev) => ({ ...prev, mainGoal: { ...prev.mainGoal, label } }))} />;
      case 'secondaryArea':
        return <LifeAreaStep value={setup.secondaryGoals[0]?.label ?? ''} isDark={isDark} onChange={handleSecondaryAreaChange} />;
      case 'text':
      case 'longtext':
        if (secondaryIndex !== undefined && step.secondaryField) {
          return (
            <TextStep
              step={step}
              value={getSecondaryTextValue(setup, secondaryIndex, step.secondaryField)}
              multiline={step.kind === 'longtext'}
              isDark={isDark}
              onChange={(value) => setSetup((prev) => setSecondaryTextValue(prev, secondaryIndex, step.secondaryField!, value))}
            />
          );
        }
        return step.field ? <TextStep step={step} value={getTextValue(setup, step.field)} multiline={step.kind === 'longtext'} isDark={isDark} onChange={(value) => setSetup((prev) => setTextValue(prev, step.field!, value))} /> : null;
      case 'metrics':
        if (secondaryIndex !== undefined) {
          return (
            <MetricsStep
              value={setup.secondaryGoals[secondaryIndex]?.metrics ?? []}
              isDark={isDark}
              onChange={(metrics) => setSetup((prev) => ({ ...prev, secondaryGoals: prev.secondaryGoals.map((goal, i) => (i === secondaryIndex ? { ...goal, metrics } : goal)) }))}
            />
          );
        }
        return <MetricsStep value={setup.mainGoal.metrics} isDark={isDark} onChange={(metrics) => setSetup((prev) => ({ ...prev, mainGoal: { ...prev.mainGoal, metrics } }))} />;
      case 'lifeAreaMulti':
        return <LifeAreaMultiStep value={setup.secondaryGoals} excludeAreaId={setup.mainGoal.label} isDark={isDark} onChange={(secondaryGoals) => setSetup((prev) => ({ ...prev, secondaryGoals }))} />;
      case 'review':
        return <ReviewStep setup={setup} isDark={isDark} scope={isAddSecondary ? 'secondaryOnly' : 'full'} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ProgressHeader current={index} total={steps.length} isDark={isDark} canGoBack={index > 0} onBack={goBack} onClose={onClose} />

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        <View key={step.id} className="flex-1">
          <StepShell step={step} isDark={isDark}>
            {renderStep()}
            <NavFooter label={footerLabel} enabled={complete} loading={submitting} skipLabel={showSkip ? 'Pular por agora' : undefined} onPress={goNext} onSkip={showSkip ? goNext : undefined} />
          </StepShell>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
