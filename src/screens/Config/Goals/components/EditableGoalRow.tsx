import { Star, Trash2 } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Goal } from '../data';

type EditableGoalRowProps = {
  goal: Goal;
  isDark: boolean;
  isMain?: boolean;
  onChange: (goal: Goal) => void;
  onRemove?: () => void;
};

export default function EditableGoalRow({ goal, isDark, isMain = false, onChange, onRemove }: EditableGoalRowProps) {
  const inputClass = 'rounded-xl border px-3 py-2.5 text-[15px] text-zinc-900 dark:text-zinc-50';
  const inputStyle = {
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
  };
  const placeholderColor = isDark ? '#71717a' : '#a1a1aa';

  let borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';
  if (isMain) {
    borderColor = isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)';
    backgroundColor = isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)';
  }

  return (
    <View className="rounded-2xl border p-4" style={{ borderColor, backgroundColor }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {isMain ? <Star size={14} color="#f59e0b" fill="#f59e0b" /> : null}
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400" style={isMain ? { marginLeft: 6 } : undefined}>
            {isMain ? 'Meta Principal' : 'Meta Secundária'}
          </Text>
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel="Remover meta"
            className="size-8 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}
          >
            <Trash2 size={15} color="#ef4444" />
          </Pressable>
        ) : null}
      </View>

      <TextInput value={goal.name} onChangeText={(name) => onChange({ ...goal, name })} placeholder="Nome da meta" placeholderTextColor={placeholderColor} className={`mt-3 ${inputClass}`} style={inputStyle} />

      <TextInput
        value={goal.label}
        onChangeText={(label) => onChange({ ...goal, label: label.toUpperCase() })}
        placeholder="Ex.: CORPO, FLOWLY, LEITURA"
        placeholderTextColor={placeholderColor}
        autoCapitalize="characters"
        maxLength={16}
        className={`mt-2 ${inputClass}`}
        style={[inputStyle, { fontWeight: '600', letterSpacing: 0.5 }]}
      />
      <Text className="ml-1 mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">Identificador curto da meta. Será usado para indicar a qual meta uma atividade pertence.</Text>

      <TextInput
        value={goal.description}
        onChangeText={(description) => onChange({ ...goal, description })}
        placeholder="Descrição"
        placeholderTextColor={placeholderColor}
        multiline
        className={`mt-2 min-h-[60px] ${inputClass}`}
        style={[inputStyle, { textAlignVertical: 'top' }]}
      />
    </View>
  );
}
