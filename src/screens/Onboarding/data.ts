import type { OnboardingLanguage } from '@/lib/onboarding';

/**
 * # Onboarding data-driven
 *
 * O fluxo de onboarding é orientado por dados: cada tela é descrita por um
 * {@link OnboardingStep} e renderizada dinamicamente pelo wizard. Assim a
 * sequência e o conteúdo podem ser atualizados pelo backend (via
 * `GET /onboarding`) sem mexer na UI.
 *
 * {@link DEFAULT_ONBOARDING} funciona como **mock inicial** e também como
 * fallback caso o backend não responda.
 */

/** Tipo de tela renderizada em cada passo. */
export type OnboardingStepKind = 'language' | 'intro' | 'quote' | 'goals' | 'activities' | 'notifications' | 'microphone' | 'sleepProfile' | 'payment' | 'completed';

/** Campos comuns a todos os passos. */
type BaseStep = {
  /** Identificador estável (usado como key). */
  id: string;
  kind: OnboardingStepKind;
  /** Nome do ícone Lucide associado ao passo. */
  icon?: string;
  /** Título principal exibido em destaque. */
  title?: string;
  /** Texto de apoio abaixo do título. */
  subtitle?: string;
};

/** Opção de idioma exibida no passo de seleção. */
export type LanguageOption = {
  code: OnboardingLanguage;
  label: string;
  /** Quando `false`, a opção aparece desabilitada ("em breve"). */
  enabled: boolean;
};

/** Item destacado (ícone + título + descrição) usado na tela de intro. */
export type OnboardingHighlight = {
  icon: string;
  title: string;
  description: string;
};

export type LanguageStep = BaseStep & {
  kind: 'language';
  languages: LanguageOption[];
  ctaLabel: string;
};

export type IntroStep = BaseStep & {
  kind: 'intro';
  highlights: OnboardingHighlight[];
  ctaLabel: string;
};

export type QuoteStep = BaseStep & {
  kind: 'quote';
  /** Frase de efeito exibida entre as telas. */
  quote: string;
  /** Atribuição/fonte da frase (opcional). */
  author?: string;
  ctaLabel: string;
};

export type GoalsStep = BaseStep & {
  kind: 'goals';
  highlights: OnboardingHighlight[];
  /** Rótulo do botão que abre o fluxo de criação de metas. */
  ctaLabel: string;
  /** Rótulo para seguir sem definir metas agora. */
  skipLabel: string;
};

export type ActivitiesStep = BaseStep & {
  kind: 'activities';
  highlights: OnboardingHighlight[];
  /** Rótulo do botão que abre o fluxo de criação de atividade. */
  addLabel: string;
  /** Rótulo do botão que avança o onboarding. */
  ctaLabel: string;
  /** Rótulo para seguir sem criar atividades agora. */
  skipLabel: string;
};

export type NotificationsStep = BaseStep & {
  kind: 'notifications';
  benefits: string[];
  /** Rótulo do botão que solicita a permissão. */
  ctaLabel: string;
  /** Rótulo para seguir sem habilitar. */
  skipLabel: string;
};

export type MicrophoneStep = BaseStep & {
  kind: 'microphone';
  benefits: string[];
  /** Rótulo do botão que solicita a permissão. */
  ctaLabel: string;
  /** Rótulo para seguir sem habilitar. */
  skipLabel: string;
};

export type SleepProfileStep = BaseStep & {
  kind: 'sleepProfile';
  /** Rótulo para seguir sem configurar. */
  skipLabel: string;
};

export type PaymentStep = BaseStep & {
  kind: 'payment';
  benefits: string[];
  /** Texto de preço/destaque (mock). */
  priceLabel: string;
  /** Rótulo do botão que abre o paywall. */
  ctaLabel: string;
  /** Rótulo para seguir sem assinar. */
  skipLabel: string;
  /** Observação adicional (ex.: "cancele quando quiser"). */
  footnote?: string;
};

export type CompletedStep = BaseStep & {
  kind: 'completed';
  ctaLabel: string;
};

export type OnboardingStep = LanguageStep | IntroStep | QuoteStep | GoalsStep | ActivitiesStep | NotificationsStep | MicrophoneStep | SleepProfileStep | PaymentStep | CompletedStep;

export type OnboardingConfig = {
  steps: OnboardingStep[];
};

/**
 * Roteiro padrão do onboarding. Serve de mock inicial e de fallback caso o
 * backend (`GET /onboarding`) não responda. Frases de efeito são passos
 * `quote` inseridos entre as telas de conteúdo.
 */
export const DEFAULT_ONBOARDING: OnboardingConfig = {
  steps: [
    {
      id: 'language',
      kind: 'language',
      icon: 'Languages',
      title: 'Escolha seu idioma',
      subtitle: 'Você poderá alterar isso depois nas configurações.',
      languages: [
        { code: 'pt-BR', label: 'Português (Brasil)', enabled: true },
        { code: 'en-US', label: 'English (US)', enabled: false },
      ],
      ctaLabel: 'Continuar',
    },
    {
      id: 'quote-welcome',
      kind: 'quote',
      quote: 'Quem define metas com prazo e reporta o progresso semanalmente tem 40% mais chances de alcançá-las do que quem não faz isso.',
      author: 'Matthews, 2007',
      ctaLabel: 'Vamos começar',
    },
    {
      id: 'intro',
      kind: 'intro',
      icon: 'Sparkles',
      title: 'Bem-vindo ao Flowly',
      subtitle: 'O Flowly transforma a sua visão em metas claras e em ações do dia a dia, respeitando a sua energia. Veja o que vamos configurar juntos:',
      highlights: [
        { icon: 'Target', title: 'Defina seus objetivos', description: 'Escolha sua meta principal e as áreas que importam para este ciclo.' },
        { icon: 'ListChecks', title: 'Crie suas atividades', description: 'Crie as primeiras atividades para colocar as metas em prática — recomendamos 3.' },
        { icon: 'TrendingUp', title: 'Acompanhe seu progresso', description: 'Veja sua evolução semana a semana e mantenha o foco.' },
      ],
      ctaLabel: 'Continuar',
    },
    {
      id: 'notifications',
      kind: 'notifications',
      icon: 'Bell',
      title: 'Ative as notificações',
      subtitle: 'Lembretes no momento certo aumentam muito a sua chance de concluir o que planejou.',
      benefits: ['Lembretes das suas atividades no horário ideal', 'Avisos de revisão semanal do seu progresso', 'Incentivos para manter a consistência'],
      ctaLabel: 'Ativar notificações',
      skipLabel: 'Agora não',
    },
    {
      id: 'microphone',
      kind: 'microphone',
      icon: 'Mic',
      title: 'Fale com o Flowly',
      subtitle: 'Crie tarefas por voz, sem digitar: segure o botão de microfone e diga o que precisa fazer.',
      benefits: ['Crie tarefas falando, em qualquer tela', 'Diga a data naturalmente: "hoje às 2 da tarde"', 'Mais rápido do que preencher o formulário'],
      ctaLabel: 'Permitir microfone',
      skipLabel: 'Agora não',
    },
    {
      id: 'sleep-profile',
      kind: 'sleepProfile',
      icon: 'BatteryCharging',
      title: 'Sua energia ao longo do dia',
      subtitle: 'O Flowly organiza suas atividades pela sua energia biológica. Para isso, precisamos saber quando você dorme e acorda.',
      skipLabel: 'Pular por agora',
    },
    {
      id: 'quote-habits',
      kind: 'quote',
      quote: 'Pequenas ações repetidas todos os dias constroem grandes resultados. A consistência vence a intensidade.',
      ctaLabel: 'Continuar',
    },
    {
      id: 'goals',
      kind: 'goals',
      icon: 'Target',
      title: 'Defina seus objetivos',
      subtitle: 'Metas transformam visão em execução. Defina sua meta principal — e, se quiser, metas secundárias — para as próximas 12 semanas.',
      highlights: [
        { icon: 'Target', title: 'Escolha sua área de foco', description: 'Selecione o que mais importa neste ciclo.' },
        { icon: 'Flag', title: 'Nomeie seu resultado', description: 'Defina o que estará concluído ao fim do ciclo.' },
        { icon: 'Gauge', title: 'Crie métricas claras', description: 'Acompanhe o seu progresso de verdade.' },
      ],
      ctaLabel: 'Definir meus objetivos',
      skipLabel: 'Pular por agora',
    },
    {
      id: 'activities',
      kind: 'activities',
      icon: 'ListChecks',
      title: 'Crie suas atividades',
      subtitle: 'Atividades são as ações concretas que levam você até o seu objetivo. Recomendamos criar 3 para começar com o pé direito.',
      highlights: [
        { icon: 'ListChecks', title: 'Ações do dia a dia', description: 'Transforme cada meta em passos executáveis.' },
        { icon: 'Timer', title: 'Defina a frequência', description: 'Escolha quando e com que ritmo realizar cada atividade.' },
        { icon: 'TrendingUp', title: 'Mantenha o ritmo', description: 'A consistência das atividades move o seu progresso.' },
      ],
      addLabel: 'Adicionar atividade',
      ctaLabel: 'Continuar',
      skipLabel: 'Pular por agora',
    },
    {
      id: 'payment',
      kind: 'payment',
      icon: 'Crown',
      title: 'Desbloqueie todo o Flowly',
      subtitle: 'Tenha acesso completo aos recursos que aceleram o seu progresso.',
      benefits: ['Metas e atividades ilimitadas', 'Acompanhamento de energia e estatísticas avançadas', 'Sincronização com o calendário', 'Suporte prioritário'],
      priceLabel: 'Comece com 7 dias grátis',
      ctaLabel: 'Ver planos',
      skipLabel: 'Continuar sem assinar',
      footnote: 'Cancele quando quiser.',
    },
    {
      id: 'completed',
      kind: 'completed',
      icon: 'CircleCheck',
      title: 'Tudo pronto!',
      subtitle: 'Seu Flowly está configurado. Agora é hora de transformar suas metas em conquistas.',
      ctaLabel: 'Entrar no Flowly',
    },
  ],
};
