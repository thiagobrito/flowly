import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isDark: boolean;
};

const ACCENT = '#6366f1';

export default function Checkbox({ label, checked, onChange, isDark }: CheckboxProps) {
  let borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)';
  if (checked) {
    borderColor = ACCENT;
  }

  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} className="flex-row items-center active:opacity-70">
      <View
        className="h-5 w-5 items-center justify-center rounded-md border"
        style={{
          borderColor,
          backgroundColor: checked ? ACCENT : 'transparent',
        }}
      >
        {checked ? <Check size={13} color="#ffffff" /> : null}
      </View>
      <Text className="ml-2 text-sm text-zinc-600 dark:text-zinc-300">{label}</Text>
    </Pressable>
  );
}
