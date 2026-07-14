import { Monitor, Moon, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { type ThemeMode, useThemePreference } from '@/lib/theme';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';

const ACCENT = '#6366f1';

type Option = {
  mode: ThemeMode;
  label: string;
  Icon: typeof Monitor;
};

const OPTIONS: Option[] = [
  { mode: 'system', label: 'Sistema', Icon: Monitor },
  { mode: 'light', label: 'Claro', Icon: Sun },
  { mode: 'dark', label: 'Escuro', Icon: Moon },
];

export default function AppearanceSection({ isDark }: { isDark: boolean }) {
  const { mode, setMode } = useThemePreference();
  const inactiveColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <>
      <SectionTitle isDark={isDark}>Aparência</SectionTitle>
      <Card isDark={isDark}>
        <View className="flex-row gap-2 p-2">
          {OPTIONS.map(({ mode: optionMode, label, Icon }) => {
            const selected = mode === optionMode;
            return (
              <Pressable
                key={optionMode}
                onPress={() => setMode(optionMode)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                className="flex-1 items-center justify-center rounded-xl py-3 active:opacity-80"
                style={{
                  backgroundColor: selected ? `${ACCENT}1a` : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? ACCENT : 'transparent',
                }}
              >
                <Icon size={22} color={selected ? ACCENT : inactiveColor} />
                <Text className="mt-1.5 text-sm font-medium" style={{ color: selected ? ACCENT : inactiveColor }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </>
  );
}
