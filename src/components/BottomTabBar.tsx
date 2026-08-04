import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { BarChart3, CalendarDays, Flag, Lock, Plus, ScrollText } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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

type SideTab = {
  key: TabKey;
  label: string;
  Icon: LucideIcon;
};

const NEW_TAB: SideTab = { key: 'new', label: 'Nova atividade', Icon: Plus };
const CALENDAR_TAB: SideTab = { key: 'calendar', label: 'Calendário', Icon: CalendarDays };
const HOME_TAB: SideTab = { key: 'home', label: 'Home', Icon: ScrollText };
const GOALS_TAB: SideTab = { key: 'goals', label: 'Metas', Icon: Flag };

const PROGRESS_TAB: SideTab = {
  key: 'progress',
  label: 'Gráficos de andamento',
  Icon: BarChart3,
};

function SideTabButton({ tab, active, locked, isDark, onPress }: { tab: SideTab; active: boolean; locked: boolean; isDark: boolean; onPress: () => void }) {
  const activeColor = '#3b82f6';
  const inactiveColor = isDark ? '#52525b' : '#a1a1aa';
  const color = active ? activeColor : inactiveColor;

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
      accessibilityLabel={locked ? `${tab.label} (bloqueado)` : tab.label}
      accessibilityState={{ selected: active }}
      className="size-16 items-center justify-center"
      style={({ pressed }) => (pressed && !active ? { opacity: 0.7 } : undefined)}
    >
      <AnimatedLinearGradient
        colors={['#3b82f6', '#6366f1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            height: 64,
            width: 64,
            borderRadius: 32,
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 14,
            elevation: 10,
          },
          gradientStyle,
        ]}
      />
      <View style={{ opacity: locked && !active ? 0.55 : 1 }}>
        <tab.Icon size={active ? 30 : 24} color={active ? '#ffffff' : color} strokeWidth={active ? 2.6 : 2} />
      </View>
      {locked ? (
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-full"
          style={{
            right: 10,
            top: 10,
            height: 18,
            width: 18,
            backgroundColor: isDark ? '#27272a' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <Lock size={10} color="#6366f1" strokeWidth={2.6} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function BottomTabBar({ active, onChange, lockedTabs = [] }: BottomTabBarProps) {
  const isDark = useColorScheme() === 'dark';
  const locked = new Set(lockedTabs);

  return (
    <BlurView pointerEvents="box-none" intensity={10} tint={isDark ? 'dark' : 'light'} className="absolute inset-x-0 -bottom-5 px-6">
      <View
        className="flex-row items-center justify-between rounded-3xl bg-white px-4 dark:bg-zinc-900"
        style={{
          height: 68,
          shadowColor: '#1e3a8a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.12,
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
