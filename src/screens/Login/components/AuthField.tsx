import type { LucideIcon } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

type AuthFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  Icon: LucideIcon;
  isDark: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
};

export default function AuthField({ label, placeholder, value, onChangeText, Icon, isDark, secure = false, keyboardType, autoCapitalize = 'none' }: AuthFieldProps) {
  const [hidden, setHidden] = useState(secure);

  const iconColor = isDark ? '#a1a1aa' : '#71717a';
  const placeholderColor = isDark ? '#71717a' : '#a1a1aa';

  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</Text>
      <View
        className="flex-row items-center rounded-2xl border px-4"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        }}
      >
        <Icon size={18} color={iconColor} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          className="ml-3 flex-1 py-3.5 text-base text-zinc-900 dark:text-zinc-50"
        />
        {secure ? (
          <Pressable onPress={() => setHidden((prev) => !prev)} accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'} hitSlop={8} className="active:opacity-70">
            {hidden ? <EyeOff size={18} color={iconColor} /> : <Eye size={18} color={iconColor} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
