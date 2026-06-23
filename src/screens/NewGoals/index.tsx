import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { api } from '@/lib/network';
import type { GoalSetup } from '@/screens/Goals/data';
import { createEmptyGoalSetup } from '@/screens/Goals/data';

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
import { ANAMNESIS_STEPS, buildAnamnesisSteps, createEmptyMetric, getSecondaryTextValue, getTextValue, isStepComplete, setSecondaryTextValue, setTextValue } from './data';

type NewGoalsProps = {
  isDark: boolean;
  onComplete?: (setup: GoalSetup) => void;
  onClose?: () => void;
};

function initialSetup(): GoalSetup {
  const setup = createEmptyGoalSetup();
  return { ...setup, mainGoal: { ...setup.mainGoal, metrics: [createEmptyMetric()] } };
}

export default function NewGoals({ isDark, onComplete, onClose }: NewGoalsProps) {
  const [baseSteps, setBaseSteps] = useState<AnamnesisStep[]>(ANAMNESIS_STEPS);
  const [index, setIndex] = useState(0);
  const [setup, setSetup] = useState<GoalSetup>(initialSetup);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
  }, []);

  const steps = useMemo(() => buildAnamnesisSteps(baseSteps, setup.secondaryGoals), [baseSteps, setup.secondaryGoals]);

  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;
  const complete = useMemo(() => (step ? isStepComplete(step, setup) : false), [step, setup]);

  const goBack = useCallback(() => setIndex((prev) => Math.max(0, prev - 1)), []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      await api.post('/goals/anamnesis', setup);
    } catch {
      // segue o fluxo localmente mesmo sem backend disponível
    } finally {
      setSubmitting(false);
      onComplete?.(setup);
    }
  }, [setup, onComplete]);

  const goNext = useCallback(() => {
    if (isLast) {
      submit();
      return;
    }
    setIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }, [isLast, steps.length, submit]);

  if (!step) return null;

  let footerLabel = 'Continuar';
  if (isLast) footerLabel = 'Criar meu ciclo';
  else if (step.kind === 'intro') footerLabel = 'Começar';
  const showSkip = step.kind === 'lifeAreaMulti';

  const renderStep = () => {
    const { secondaryIndex } = step;

    switch (step.kind) {
      case 'intro':
        return <IntroStep isDark={isDark} total={steps.length} />;
      case 'dateRange':
        return <DateRangeStep startDate={setup.cycle.startDate} endDate={setup.cycle.endDate} isDark={isDark} onChange={(cycle) => setSetup((prev) => ({ ...prev, cycle }))} />;
      case 'lifeArea':
        return <LifeAreaStep value={setup.mainGoal.label} isDark={isDark} onChange={(label) => setSetup((prev) => ({ ...prev, mainGoal: { ...prev.mainGoal, label } }))} />;
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
        return <ReviewStep setup={setup} isDark={isDark} />;
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
