import { GetLifeArea } from '@/screens/common';
import type { GoalSetup, SecondaryGoalSetup } from '@/screens/Goals/data';

/**
 * # Anamnese de metas (NewGoals)
 *
 * O fluxo é orientado por dados: cada passo é descrito por um {@link AnamnesisStep}
 * e renderizado dinamicamente pelo wizard. Assim as perguntas podem ser
 * atualizadas pelo backend (via `GET /goals/anamnesis`) sem mexer na UI.
 *
 * O resultado preenche um {@link GoalSetup} — os campos não perguntados
 * (progresso, semanas, consistência etc.) são calculados no backend.
 */

/** Tipo de controle renderizado em cada passo. */
export type AnamnesisStepKind = 'intro' | 'lifeArea' | 'text' | 'longtext' | 'metrics' | 'lifeAreaMulti' | 'dateRange' | 'review';

/** Caminho do campo de texto editado por passos `text`/`longtext`. */
export type AnamnesisTextField = 'mainGoal.name' | 'mainGoal.rpm.result' | 'mainGoal.rpm.purpose' | 'mainGoal.rpm.impact' | 'mainGoal.label';

/** Campo de texto editado em passos de uma meta secundária. */
export type SecondaryTextField = 'name' | 'rpm.result' | 'rpm.purpose' | 'rpm.impact';

export type AnamnesisStep = {
  /** Identificador estável (usado como key e para retomar o fluxo). */
  id: string;
  kind: AnamnesisStepKind;
  /** Pergunta principal exibida em destaque. */
  title: string;
  /** Texto de apoio curto, abaixo do título. */
  subtitle?: string;
  /** Dica adicional (ex.: exemplo de resposta). */
  helper?: string;
  /** Placeholder para passos de texto. */
  placeholder?: string;
  /** Caminho do campo editado — obrigatório para `text`/`longtext`. */
  field?: AnamnesisTextField;
  /** Nome do ícone Lucide associado ao passo. */
  icon?: string;
  /** Quando `true`, impede avançar sem resposta válida. */
  required?: boolean;
  /** Índice da meta secundária quando o passo é gerado dinamicamente por área. */
  secondaryIndex?: number;
  /** Campo da meta secundária editado por passos `text`/`longtext`. */
  secondaryField?: SecondaryTextField;
};

/**
 * Roteiro padrão da anamnese. Serve de fallback caso o backend não responda e
 * é a referência de quais perguntas existem hoje.
 */
export const ANAMNESIS_STEPS: AnamnesisStep[] = [
  {
    id: 'intro',
    kind: 'intro',
    title: 'Vamos desenhar seu próximo ciclo',
    subtitle: 'Algumas perguntas rápidas para transformar sua visão em metas claras e executáveis.',
    icon: 'Sparkles',
  },
  {
    id: 'cycle',
    kind: 'dateRange',
    title: 'Qual será a duração do seu ciclo?',
    subtitle: 'Ciclos de 12 semanas criam foco e urgência. Você pode ajustar as datas.',
    icon: 'CalendarRange',
  },
  {
    id: 'main-area',
    kind: 'lifeArea',
    title: 'Qual área da vida é a sua prioridade agora?',
    subtitle: 'Sua meta principal vai concentrar a maior parte da sua energia neste ciclo.',
    icon: 'Target',
    required: true,
  },
  {
    id: 'main-name',
    kind: 'text',
    field: 'mainGoal.name',
    title: 'Dê um nome para a sua meta principal',
    subtitle: 'Algo curto e inspirador que você lembre todos os dias.',
    placeholder: 'Ex.: Crescer na carreira',
    icon: 'Flag',
    required: true,
  },
  {
    id: 'rpm-result',
    kind: 'longtext',
    field: 'mainGoal.rpm.result',
    title: 'Qual resultado você quer alcançar?',
    subtitle: 'Resultado (R do RPM): o que estará concluído ao fim do ciclo.',
    placeholder: 'Ex.: Conseguir promoção até setembro',
    icon: 'Trophy',
    required: true,
  },
  {
    id: 'rpm-purpose',
    kind: 'longtext',
    field: 'mainGoal.rpm.purpose',
    title: 'Por que isso é importante para você?',
    subtitle: 'Propósito (P do RPM): a razão que vai te manter motivado.',
    placeholder: 'Ex.: Ter mais impacto e reconhecimento',
    icon: 'Heart',
    required: true,
  },
  {
    id: 'rpm-impact',
    kind: 'longtext',
    field: 'mainGoal.rpm.impact',
    title: 'O que muda na sua vida ao alcançar?',
    subtitle: 'Impacto (M de massive action): a transformação que isso gera.',
    placeholder: 'Ex.: Melhorar qualidade de vida da família',
    icon: 'Sparkles',
    required: true,
  },
  {
    id: 'metrics',
    kind: 'metrics',
    title: 'Como você vai medir o progresso?',
    subtitle: 'Defina pelo menos uma métrica com valor atual e alvo.',
    icon: 'Gauge',
    required: true,
  },
  {
    id: 'secondary',
    kind: 'lifeAreaMulti',
    title: 'Quais outras áreas merecem atenção?',
    subtitle: 'Metas secundárias mantêm o equilíbrio. Opcional — selecione quantas quiser.',
    icon: 'Layers',
  },
  {
    id: 'review',
    kind: 'review',
    title: 'Tudo pronto para começar',
    subtitle: 'Revise suas respostas antes de criar seu ciclo.',
    icon: 'CircleCheck',
  },
];

/** Lê o valor de um campo de texto do {@link GoalSetup}. */
export function getTextValue(setup: GoalSetup, field: AnamnesisTextField): string {
  switch (field) {
    case 'mainGoal.name':
      return setup.mainGoal.name;
    case 'mainGoal.rpm.result':
      return setup.mainGoal.rpm.result;
    case 'mainGoal.rpm.purpose':
      return setup.mainGoal.rpm.purpose;
    case 'mainGoal.rpm.impact':
      return setup.mainGoal.rpm.impact;
    case 'mainGoal.label':
      return setup.mainGoal.label;
    default:
      return '';
  }
}

/** Retorna uma cópia do {@link GoalSetup} com o campo de texto atualizado. */
export function setTextValue(setup: GoalSetup, field: AnamnesisTextField, value: string): GoalSetup {
  switch (field) {
    case 'mainGoal.name':
      return { ...setup, mainGoal: { ...setup.mainGoal, name: value } };
    case 'mainGoal.rpm.result':
      return { ...setup, mainGoal: { ...setup.mainGoal, rpm: { ...setup.mainGoal.rpm, result: value } } };
    case 'mainGoal.rpm.purpose':
      return { ...setup, mainGoal: { ...setup.mainGoal, rpm: { ...setup.mainGoal.rpm, purpose: value } } };
    case 'mainGoal.rpm.impact':
      return { ...setup, mainGoal: { ...setup.mainGoal, rpm: { ...setup.mainGoal.rpm, impact: value } } };
    case 'mainGoal.label':
      return { ...setup, mainGoal: { ...setup.mainGoal, label: value } };
    default:
      return setup;
  }
}

/** Lê o valor de um campo de texto de uma meta secundária. */
export function getSecondaryTextValue(setup: GoalSetup, index: number, field: SecondaryTextField): string {
  const goal = setup.secondaryGoals[index];
  if (!goal) return '';
  switch (field) {
    case 'name':
      return goal.name;
    case 'rpm.result':
      return goal.rpm.result;
    case 'rpm.purpose':
      return goal.rpm.purpose;
    case 'rpm.impact':
      return goal.rpm.impact;
    default:
      return '';
  }
}

/** Retorna uma cópia do {@link GoalSetup} com o campo de texto da meta secundária atualizado. */
export function setSecondaryTextValue(setup: GoalSetup, index: number, field: SecondaryTextField, value: string): GoalSetup {
  const secondaryGoals = setup.secondaryGoals.map((goal, i) => {
    if (i !== index) return goal;
    switch (field) {
      case 'name':
        return { ...goal, name: value };
      case 'rpm.result':
        return { ...goal, rpm: { ...goal.rpm, result: value } };
      case 'rpm.purpose':
        return { ...goal, rpm: { ...goal.rpm, purpose: value } };
      case 'rpm.impact':
        return { ...goal, rpm: { ...goal.rpm, impact: value } };
      default:
        return goal;
    }
  });
  return { ...setup, secondaryGoals };
}

/** Cria as 5 telas de RPM completo de uma meta secundária. */
function buildSecondaryGroup(goal: SecondaryGoalSetup, index: number): AnamnesisStep[] {
  const areaName = GetLifeArea(goal.label)?.label ?? goal.name ?? goal.label;
  const prefix = `secondary-${index}`;

  return [
    {
      id: `${prefix}-name`,
      kind: 'text',
      secondaryIndex: index,
      secondaryField: 'name',
      title: `Dê um nome para sua meta de ${areaName}`,
      subtitle: 'Algo curto e inspirador que represente essa área.',
      placeholder: `Ex.: Evoluir em ${areaName}`,
      icon: 'Flag',
      required: true,
    },
    {
      id: `${prefix}-result`,
      kind: 'longtext',
      secondaryIndex: index,
      secondaryField: 'rpm.result',
      title: `Qual resultado você quer em ${areaName}?`,
      subtitle: 'Resultado (R do RPM): o que estará concluído ao fim do ciclo.',
      placeholder: 'Ex.: Treinar 4x por semana',
      icon: 'Trophy',
      required: true,
    },
    {
      id: `${prefix}-purpose`,
      kind: 'longtext',
      secondaryIndex: index,
      secondaryField: 'rpm.purpose',
      title: `Por que ${areaName} é importante para você?`,
      subtitle: 'Propósito (P do RPM): a razão que vai te manter motivado.',
      placeholder: 'Ex.: Ter mais energia e disposição',
      icon: 'Heart',
      required: true,
    },
    {
      id: `${prefix}-impact`,
      kind: 'longtext',
      secondaryIndex: index,
      secondaryField: 'rpm.impact',
      title: `O que muda na sua vida com ${areaName}?`,
      subtitle: 'Impacto (M de massive action): a transformação que isso gera.',
      placeholder: 'Ex.: Mais qualidade de vida no dia a dia',
      icon: 'Sparkles',
      required: true,
    },
    {
      id: `${prefix}-metrics`,
      kind: 'metrics',
      secondaryIndex: index,
      title: `Como vai medir o progresso em ${areaName}?`,
      subtitle: 'Defina pelo menos uma métrica com valor atual e alvo.',
      icon: 'Gauge',
      required: true,
    },
  ];
}

/**
 * Expande o roteiro base inserindo, logo após o passo `lifeAreaMulti`, um grupo de
 * perguntas de RPM completo (nome, resultado, propósito, impacto e métricas) para
 * cada meta secundária selecionada. Mantém o padrão de uma pergunta por tela.
 */
export function buildAnamnesisSteps(baseSteps: AnamnesisStep[], secondaryGoals: SecondaryGoalSetup[]): AnamnesisStep[] {
  const multiIndex = baseSteps.findIndex((step) => step.kind === 'lifeAreaMulti');
  if (multiIndex === -1 || secondaryGoals.length === 0) return baseSteps;

  const groups = secondaryGoals.flatMap((goal, index) => buildSecondaryGroup(goal, index));
  return [...baseSteps.slice(0, multiIndex + 1), ...groups, ...baseSteps.slice(multiIndex + 1)];
}

/** Indica se um passo já pode ser concluído (respeitando `required`). */
export function isStepComplete(step: AnamnesisStep, setup: GoalSetup): boolean {
  if (step.secondaryIndex !== undefined) {
    const goal = setup.secondaryGoals[step.secondaryIndex];
    if (!goal) return true;
    if (step.kind === 'metrics') {
      return goal.metrics.some((metric) => metric.label.trim().length > 0 && metric.target > 0);
    }
    if (step.secondaryField) {
      return getSecondaryTextValue(setup, step.secondaryIndex, step.secondaryField).trim().length > 0;
    }
    return true;
  }

  switch (step.kind) {
    case 'intro':
    case 'review':
    case 'lifeAreaMulti':
      return true;
    case 'dateRange':
      return Boolean(setup.cycle.startDate && setup.cycle.endDate && setup.cycle.endDate > setup.cycle.startDate);
    case 'lifeArea':
      return setup.mainGoal.label.trim().length > 0;
    case 'metrics':
      return setup.mainGoal.metrics.some((metric) => metric.label.trim().length > 0 && metric.target > 0);
    case 'text':
    case 'longtext':
      return step.field ? getTextValue(setup, step.field).trim().length > 0 : true;
    default:
      return true;
  }
}

let metricCounter = 0;

/** Cria uma métrica vazia para o passo de métricas. */
export function createEmptyMetric() {
  metricCounter += 1;
  return { id: `metric-${Date.now()}-${metricCounter}`, label: '', current: 0, target: 0 };
}
