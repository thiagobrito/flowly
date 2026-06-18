import type { LucideIcon } from 'lucide-react-native';
import { Check, ListChecks, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);
const ANIM_DURATION = 260;

export type FilterArea = {
  id: string;
  label: string;
  Icon: LucideIcon;
  accent: string;
  count: number;
};

type FilterDrawerProps = {
  visible: boolean;
  isDark: boolean;
  areas: FilterArea[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
};

type AreaRowProps = {
  label: string;
  Icon: LucideIcon;
  accent: string;
  count: number;
  selected: boolean;
  isDark: boolean;
  onPress: () => void;
};

function adjustLabel(label: string): string {
  // Deixa primeira letra maiuscula e depois tudo minusculo
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

function AreaRow({ label, Icon, accent, count, selected, isDark, onPress }: AreaRowProps) {
  let backgroundColor = 'transparent';
  if (selected) backgroundColor = `${accent}1f`;

  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={label} className="mb-1 flex-row items-center rounded-2xl p-3 active:opacity-70" style={{ backgroundColor }}>
      <View className="size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22` }}>
        <Icon size={18} color={accent} />
      </View>

      <Text className="ml-3 flex-1 text-[15px] font-medium text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
        {adjustLabel(label)}
      </Text>

      {selected ? (
        <View className="size-5 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
          <Check size={13} color="#ffffff" />
        </View>
      ) : (
        <Text className="text-sm font-medium" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

export default function FilterDrawer({ visible, isDark, areas, selected, onToggle, onClear, onClose }: FilterDrawerProps) {
  const [mounted, setMounted] = useState(visible);
  const translateX = useSharedValue(-PANEL_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.value = withTiming(0, { duration: ANIM_DURATION });
      backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    } else if (mounted) {
      backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
      translateX.value = withTiming(-PANEL_WIDTH, { duration: ANIM_DURATION }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, translateX, backdropOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  const hasFilter = selected.length > 0;
  let allRowBackgroundColor = 'transparent';
  if (!hasFilter) allRowBackgroundColor = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View className="flex-1 flex-row">
          <Animated.View className="absolute inset-0" style={[{ backgroundColor: 'rgba(0,0,0,0.5)' }, backdropStyle]}>
            <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar filtro" />
          </Animated.View>

          <Animated.View style={[{ width: PANEL_WIDTH }, panelStyle]} className="h-full">
            <View className="flex-1" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
              <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
                  <View className="flex-row items-center">
                    <ListChecks size={24} color="#3b82f6" style={{ marginRight: 10 }} />
                    <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Filtrar por objetivo</Text>
                  </View>

                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    className="size-8 items-center justify-center rounded-full active:opacity-70"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
                  </Pressable>
                </View>

                <View className="mx-4 mb-2 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />

                <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Mostrar todas" className="mb-1 flex-row items-center justify-between rounded-2xl p-3 active:opacity-70" style={{ backgroundColor: allRowBackgroundColor }}>
                    <Text className="text-[15px] font-semibold" style={{ color: '#3b82f6' }}>
                      Todas
                    </Text>
                    {!hasFilter ? (
                      <View className="size-5 items-center justify-center rounded-full" style={{ backgroundColor: '#3b82f6' }}>
                        <Check size={13} color="#ffffff" />
                      </View>
                    ) : null}
                  </Pressable>

                  {areas.map((area) => (
                    <AreaRow key={area.id} label={area.label} Icon={area.Icon} accent={area.accent} count={area.count} selected={selected.includes(area.id)} isDark={isDark} onPress={() => onToggle(area.id)} />
                  ))}

                  {areas.length === 0 ? <Text className="mt-6 px-3 text-center text-sm text-zinc-400 dark:text-zinc-500">Nenhuma área de vida nas suas tarefas.</Text> : null}
                </ScrollView>
              </SafeAreaView>
            </View>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
