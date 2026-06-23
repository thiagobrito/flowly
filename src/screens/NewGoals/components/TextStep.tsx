import { Lightbulb } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';

import type { AnamnesisStep } from '../data';

type TextStepProps = {
  step: AnamnesisStep;
  value: string;
  isDark: boolean;
  multiline: boolean;
  onChange: (value: string) => void;
};

export default function TextStep({ step, value, isDark, multiline, onChange }: TextStepProps) {
  const placeholderColor = isDark ? '#71717a' : '#a1a1aa';
  const inputStyle = {
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
  };

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={step.placeholder}
        placeholderTextColor={placeholderColor}
        multiline={multiline}
        autoFocus
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-2xl border px-4 text-[17px] text-zinc-900 dark:text-zinc-50 ${multiline ? 'min-h-[120px] py-3.5' : 'py-4'}`}
        style={inputStyle}
      />

      {step.helper ? (
        <View className="mt-3 flex-row items-start rounded-xl px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)' }}>
          <Lightbulb size={15} color="#6366f1" style={{ marginTop: 1 }} />
          <Text className="ml-2 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">{step.helper}</Text>
        </View>
      ) : null}
    </View>
  );
}
