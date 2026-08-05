import { CalendarClock, Check } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { CoachInsight } from '@/lib/coach';
import { ACCENT, mutedText } from '@/lib/theme';

type CoachSuggestionsProps = {
  insights: CoachInsight[];
  loading?: boolean;
  isDark: boolean;
  applyingId: string | null;
  onApply: (insight: CoachInsight) => void;
  onDismiss: (insight: CoachInsight) => void;
};

export default function CoachSuggestions({ insights, loading = false, isDark, applyingId, onApply, onDismiss }: CoachSuggestionsProps) {
  if (!loading && insights.length === 0) return null;

  const accent = ACCENT;
  const muted = mutedText(isDark);

  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sugestões do dia</Text>
      {loading ? (
        <View className="items-center justify-center py-4">
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        insights.map((insight) => {
          const applying = applyingId === insight.id;

          return (
            <View
              key={insight.id}
              className="mb-2 rounded-2xl border p-3"
              style={{
                borderColor: isDark ? 'rgba(99,102,241,0.30)' : 'rgba(99,102,241,0.20)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)',
              }}
            >
              <View className="flex-row items-start">
                <View className="mr-2 mt-0.5 size-8 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                  <CalendarClock size={16} color={accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{insight.title}</Text>
                  {insight.detail ? (
                    <Text className="mt-0.5 text-xs leading-4" style={{ color: muted }}>
                      {insight.detail}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-2.5 flex-row" style={{ gap: 8 }}>
                {insight.action ? (
                  <Pressable
                    onPress={() => onApply(insight)}
                    disabled={applying}
                    accessibilityRole="button"
                    accessibilityLabel={insight.actionLabel ?? 'Aplicar'}
                    className="flex-1 flex-row items-center justify-center rounded-xl py-2 active:opacity-80"
                    style={{ backgroundColor: accent }}
                  >
                    {applying ? <ActivityIndicator color="#fff" size="small" /> : <Check size={14} color="#fff" />}
                    <Text className="ml-1.5 text-sm font-semibold text-white">{insight.actionLabel ?? 'Aplicar'}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => onDismiss(insight)}
                  disabled={applying}
                  accessibilityRole="button"
                  accessibilityLabel="Dispensar"
                  className="rounded-xl px-3 py-2 active:opacity-70"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Agora não</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
