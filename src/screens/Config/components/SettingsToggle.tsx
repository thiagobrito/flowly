import { Switch } from 'react-native';

type SettingsToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
};

const ACCENT = '#6366f1';

export default function SettingsToggle({ value, onValueChange, disabled = false, isDark }: SettingsToggleProps) {
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
      trackColor={{
        false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        true: '#3b82f520',
      }}
      thumbColor={thumbColor}
      ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255, 255, 255, 0.15)'}
    />
  );
}
