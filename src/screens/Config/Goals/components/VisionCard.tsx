import { Check, Pencil, Telescope, X } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import Card from '../../components/Card';

type VisionCardProps = {
  vision: string;
  isDark: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function VisionCard({ vision, isDark, isEditing, onEdit, onChange, onSave, onCancel }: VisionCardProps) {
  return (
    <Card isDark={isDark}>
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="size-9 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' }}>
              <Telescope size={18} color="#6366f1" />
            </View>
            <Text className="ml-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Visão de 1 Ano</Text>
          </View>

          {isEditing ? (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancelar edição"
                className="size-9 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
              >
                <X size={15} color={isDark ? '#a1a1aa' : '#71717a'} />
              </Pressable>
              <Pressable
                onPress={onSave}
                disabled={!vision.trim()}
                accessibilityRole="button"
                accessibilityLabel="Salvar visão"
                className="size-9 items-center justify-center rounded-full active:opacity-70"
                style={{
                  backgroundColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)',
                  opacity: vision.trim() ? 1 : 0.4,
                }}
              >
                <Check size={15} color="#6366f1" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel="Editar visão"
              className="size-9 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
            >
              <Pencil size={15} color={isDark ? '#a1a1aa' : '#71717a'} />
            </Pressable>
          )}
        </View>

        {isEditing ? (
          <TextInput
            value={vision}
            onChangeText={onChange}
            multiline
            autoFocus
            placeholder="Descreva sua visão para os próximos 12 meses..."
            placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
            className="mt-3 min-h-[88px] rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-base leading-6 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-50"
            style={{ textAlignVertical: 'top' }}
          />
        ) : (
          <Text className="mt-3 text-base leading-6 text-zinc-700 dark:text-zinc-300">{vision}</Text>
        )}
      </View>
    </Card>
  );
}
