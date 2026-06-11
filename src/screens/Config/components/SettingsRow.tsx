import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type SettingsRowProps = {
  label: string;
  description?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  isDark: boolean;
  showDivider?: boolean;
};

export default function SettingsRow({ label, description, trailing, onPress, isDark, showDivider = true }: SettingsRowProps) {
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const content = (
    <View className="flex-row items-center justify-between px-4 py-3.5" style={showDivider ? { borderBottomWidth: 1, borderBottomColor: borderColor } : undefined}>
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-base font-medium text-zinc-900 dark:text-zinc-50">{label}</Text>
        {description ? <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</Text> : null}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-80">
        {content}
      </Pressable>
    );
  }

  return content;
}
