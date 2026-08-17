import { Switch } from 'react-native';

import { ACCENT } from '@/lib/theme';

type SettingsToggleProps = {
  /** Nome do ajuste: o texto ao lado do interruptor não é lido junto com ele. */
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
};

export default function SettingsToggle({ label, value, onValueChange, disabled = false, isDark }: SettingsToggleProps) {
  let thumbColor = '#fafafa';
  if (value) {
    thumbColor = ACCENT;
  } else if (isDark) {
    thumbColor = '#71717a';
  }

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{
        false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        true: '#3b82f520',
      }}
      thumbColor={thumbColor}
      ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255, 255, 255, 0.15)'}
    />
  );
}
