import type { LucideIcon } from 'lucide-react-native';
import { Bell, LockOpen, Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { TRIAL_CHARGE_NOTICE_DAY, TRIAL_DAYS } from '../constants';

type TrialStep = {
  Icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: TrialStep[] = [
  {
    Icon: LockOpen,
    title: 'Hoje',
    description: 'Desbloqueie metas, calendário, estatísticas e todos os recursos premium do Flowly.',
  },
  {
    Icon: Bell,
    title: `Em ${TRIAL_CHARGE_NOTICE_DAY} dias`,
    description: 'Você será cobrado; cancele a qualquer momento antes.',
  },
  {
    Icon: Star,
    title: `Em ${TRIAL_DAYS} dias`,
    description: 'Enviaremos um lembrete de que seu período de teste encerrará em breve.',
  },
];

type TrialTimelineProps = {
  isDark: boolean;
};

export default function TrialTimeline({ isDark }: TrialTimelineProps) {
  const lineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const titleColor = isDark ? '#fafafa' : '#18181b';
  const descriptionColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <View className="mt-8 px-6">
      {STEPS.map((step, index) => {
        const isLast = index === STEPS.length - 1;

        return (
          <View key={step.title} className="flex-row">
            <View className="mr-4 items-center">
              <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: '#3b82f6' }}>
                <step.Icon size={18} color="white" />
              </View>
              {!isLast ? <View className="my-1 w-0.5 flex-1" style={{ backgroundColor: lineColor, minHeight: 36 }} /> : null}
            </View>

            <View className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
              <Text className="text-base font-bold" style={{ color: titleColor }}>
                {step.title}
              </Text>
              <Text className="mt-1 text-sm leading-5" style={{ color: descriptionColor }}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
