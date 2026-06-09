import { Pressable, Text, View } from 'react-native';

export type AuthTab = 'login' | 'signup';

type AuthTabsProps = {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
  isDark: boolean;
};

const TABS: { value: AuthTab; label: string }[] = [
  { value: 'login', label: 'Entrar' },
  { value: 'signup', label: 'Criar conta' },
];

export default function AuthTabs({ active, onChange, isDark }: AuthTabsProps) {
  return (
    <View className="flex-row rounded-2xl p-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
      {TABS.map((tab) => {
        const selected = active === tab.value;
        let textColor = isDark ? '#a1a1aa' : '#71717a';
        let backgroundColor = 'transparent';
        if (selected) {
          textColor = isDark ? '#f4f4f5' : '#18181b';
          backgroundColor = isDark ? '#27272a' : '#ffffff';
        }

        return (
          <Pressable key={tab.value} onPress={() => onChange(tab.value)} accessibilityRole="button" accessibilityState={{ selected }} className="flex-1 active:opacity-80">
            <View
              className="items-center rounded-xl py-2.5"
              style={{
                backgroundColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: selected ? 0.08 : 0,
                shadowRadius: 4,
                elevation: selected ? 2 : 0,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: textColor }}>
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
