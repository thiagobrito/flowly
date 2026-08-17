import { Monitor, Moon, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { accentOn, accentTint, mutedText, type ThemeMode, useThemePreference } from '@/lib/theme';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';

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
  const inactiveColor = mutedText(isDark);
  // O verde escuro do acento some contra o fundo escuro — justamente na tela
  // onde se escolhe o modo escuro.
  const activeColor = accentOn(isDark);

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
                  backgroundColor: selected ? accentTint(isDark ? 0.2 : 0.1) : 'transparent',
                  borderWidth: 1,
                  borderColor: selected ? activeColor : 'transparent',
                }}
              >
                <Icon size={22} color={selected ? activeColor : inactiveColor} />
                <Text className="mt-1.5 text-sm font-medium" style={{ color: selected ? activeColor : inactiveColor }}>
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
