import type { LucideIcon } from 'lucide-react-native';
import { Heart, Sparkles, Target } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { Goal } from '../data';

type RpmSectionProps = {
  rpm: Goal['rpm'];
};

function RpmBlock({ Icon, title, text, accent }: { Icon: LucideIcon; title: string; text: string; accent: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="mt-0.5 size-7 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}22` }}>
        <Icon size={15} color={accent} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-sm leading-5 text-zinc-700 dark:text-zinc-200">{text}</Text>
      </View>
    </View>
  );
}

export default function RpmSection({ rpm }: RpmSectionProps) {
  return (
    <View className="gap-3">
      <RpmBlock Icon={Target} title="Resultado" text={rpm.result} accent="#3b82f6" />
      <RpmBlock Icon={Heart} title="Propósito" text={rpm.purpose} accent="#ec4899" />
      <RpmBlock Icon={Sparkles} title="Impacto" text={rpm.impact} accent="#a855f7" />
    </View>
  );
}
