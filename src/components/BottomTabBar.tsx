import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { BarChart3, CalendarDays, Home, Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export type TabKey = 'new' | 'home' | 'calendar' | 'progress';

type BottomTabBarProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

type SideTab = {
  key: TabKey;
  label: string;
  Icon: LucideIcon;
};

const NEW_TAB: SideTab = { key: 'new', label: 'Nova atividade', Icon: Plus };
const CALENDAR_TAB: SideTab = { key: 'calendar', label: 'Calendário', Icon: CalendarDays };
const HOME_TAB: SideTab = { key: 'home', label: 'Home', Icon: Home };

const PROGRESS_TAB: SideTab = {
  key: 'progress',
  label: 'Gráficos de andamento',
  Icon: BarChart3,
};

function SideTabButton({ tab, active, isDark, onPress }: { tab: SideTab; active: boolean; isDark: boolean; onPress: () => void }) {
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

  if (active) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} className="size-16 items-center justify-center">
        <AnimatedLinearGradient
          colors={['#3b82f6', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              height: 64,
              width: 64,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 14,
              elevation: 10,
            },
            gradientStyle,
          ]}
        >
          <tab.Icon size={30} color="#ffffff" strokeWidth={2.6} />
        </AnimatedLinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} className="h-12 w-16 items-center justify-center active:opacity-70">
      <tab.Icon size={24} color={color} />
    </Pressable>
  );
}

export default function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <BlurView pointerEvents="box-none" intensity={10} tint={isDark ? 'dark' : 'light'} className="absolute inset-x-0 -bottom-5 px-6">
      <View
        className="flex-row items-center justify-between rounded-3xl bg-white px-6 dark:bg-zinc-900"
        style={{
          height: 68,
          shadowColor: '#1e3a8a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <SideTabButton tab={NEW_TAB} active={active === NEW_TAB.key} isDark={isDark} onPress={() => onChange('new')} />
        <SideTabButton tab={HOME_TAB} active={active === 'home'} isDark={isDark} onPress={() => onChange('home')} />

        <SideTabButton tab={CALENDAR_TAB} active={active === CALENDAR_TAB.key} isDark={isDark} onPress={() => onChange('calendar')} />
        <SideTabButton tab={PROGRESS_TAB} active={active === PROGRESS_TAB.key} isDark={isDark} onPress={() => onChange('progress')} />
      </View>
    </BlurView>
  );
}
