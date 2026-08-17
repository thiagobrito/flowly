import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { BarChart3, CalendarDays, Flag, Lock, Plus, ScrollText } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ACCENT, ACCENT_LIGHT, accentOn, mutedText, useIsDark } from '@/lib/theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export type TabKey = 'new' | 'home' | 'goals' | 'calendar' | 'progress';

/** Tabs que exigem assinatura quando o trial/assinatura acabou. */
export const PREMIUM_TABS: readonly TabKey[] = ['calendar', 'progress', 'goals'];

type BottomTabBarProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** Tabs exibidas com cadeado (ainda clicáveis — quem decide o bloqueio é o pai). */
  lockedTabs?: readonly TabKey[];
};

/**
 * Cada tab tem dois nomes.
 *
 * `label` é o que cabe embaixo do ícone; `accessibilityLabel` é o nome completo,
 * que o leitor de tela anuncia e que os testes E2E usam para navegar. Eles
 * divergem de propósito: "Progresso" cabe na barra, "Gráficos de andamento"
 * explica a tela.
 *
 * A tab do calendário é "Agenda" e não "Calendário" para não repetir o título
 * da própria tela — dois "Calendário" visíveis ao mesmo tempo confundem tanto o
 * olho quanto qualquer busca por texto.
 */
type SideTab = {
  key: TabKey;
  label: string;
  accessibilityLabel: string;
  Icon: LucideIcon;
};

const NEW_TAB: SideTab = { key: 'new', label: 'Nova', accessibilityLabel: 'Nova atividade', Icon: Plus };
const CALENDAR_TAB: SideTab = { key: 'calendar', label: 'Agenda', accessibilityLabel: 'Calendário', Icon: CalendarDays };
const HOME_TAB: SideTab = { key: 'home', label: 'Hoje', accessibilityLabel: 'Home', Icon: ScrollText };
const GOALS_TAB: SideTab = { key: 'goals', label: 'Metas', accessibilityLabel: 'Metas', Icon: Flag };

const PROGRESS_TAB: SideTab = {
  key: 'progress',
  label: 'Progresso',
  accessibilityLabel: 'Gráficos de andamento',
  Icon: BarChart3,
};

function SideTabButton({ tab, active, locked, isDark, onPress }: { tab: SideTab; active: boolean; locked: boolean; isDark: boolean; onPress: () => void }) {
  const inactiveColor = isDark ? '#6B655B' : '#A8A196';
  const iconColor = active ? '#ffffff' : inactiveColor;

  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 12, stiffness: 180, mass: 0.6 });
  }, [active, progress]);

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${tab.accessibilityLabel} (bloqueado)` : tab.accessibilityLabel}
      accessibilityState={{ selected: active }}
      className="w-16 items-center justify-center"
      style={({ pressed }) => (pressed && !active ? { opacity: 0.7 } : undefined)}
    >
      <View className="size-11 items-center justify-center">
        <AnimatedLinearGradient
          colors={[ACCENT, ACCENT_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              height: 44,
              width: 44,
              borderRadius: 22,
              shadowColor: ACCENT,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            },
            gradientStyle,
          ]}
        />
        <View style={{ opacity: locked && !active ? 0.55 : 1 }}>
          <tab.Icon size={active ? 22 : 21} color={iconColor} strokeWidth={active ? 2.6 : 2} />
        </View>
        {locked ? (
          <View
            pointerEvents="none"
            className="absolute items-center justify-center rounded-full"
            style={{
              right: -1,
              top: -1,
              height: 16,
              width: 16,
              backgroundColor: isDark ? '#27272a' : '#FFFDF9',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(28,27,24,0.08)',
            }}
          >
            <Lock size={9} color={accentOn(isDark)} strokeWidth={2.6} />
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} className="mt-1 text-[10px]" style={{ color: active ? accentOn(isDark) : mutedText(isDark), fontWeight: active ? '700' : '500' }}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function BottomTabBar({ active, onChange, lockedTabs = [] }: BottomTabBarProps) {
  const isDark = useIsDark();
  const locked = new Set(lockedTabs);

  return (
    <BlurView pointerEvents="box-none" intensity={10} tint={isDark ? 'dark' : 'light'} className="absolute inset-x-0 bottom-0 px-4">
      <View
        className="flex-row items-center justify-between rounded-3xl px-2 dark:bg-zinc-900"
        style={{
          height: 74,
          backgroundColor: isDark ? undefined : '#FFFDF9',
          shadowColor: '#2A2419',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.14,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <SideTabButton tab={NEW_TAB} active={active === NEW_TAB.key} locked={locked.has(NEW_TAB.key)} isDark={isDark} onPress={() => onChange('new')} />
        <SideTabButton tab={HOME_TAB} active={active === 'home'} locked={locked.has(HOME_TAB.key)} isDark={isDark} onPress={() => onChange('home')} />

        <SideTabButton tab={CALENDAR_TAB} active={active === CALENDAR_TAB.key} locked={locked.has(CALENDAR_TAB.key)} isDark={isDark} onPress={() => onChange('calendar')} />
        <SideTabButton tab={PROGRESS_TAB} active={active === PROGRESS_TAB.key} locked={locked.has(PROGRESS_TAB.key)} isDark={isDark} onPress={() => onChange('progress')} />
        <SideTabButton tab={GOALS_TAB} active={active === GOALS_TAB.key} locked={locked.has(GOALS_TAB.key)} isDark={isDark} onPress={() => onChange('goals')} />
      </View>
    </BlurView>
  );
}
