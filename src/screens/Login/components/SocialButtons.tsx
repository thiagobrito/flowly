import { Apple } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type SocialButtonsProps = {
  isDark: boolean;
  onGoogle?: () => void;
  onApple?: () => void;
};

function Divider({ isDark }: { isDark: boolean }) {
  const lineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';

  return (
    <View className="flex-row items-center">
      <View className="h-px flex-1" style={{ backgroundColor: lineColor }} />
      <Text className="mx-3 text-xs text-zinc-500 dark:text-zinc-400">Ou continue com</Text>
      <View className="h-px flex-1" style={{ backgroundColor: lineColor }} />
    </View>
  );
}

function SocialButton({ label, isDark, onPress, children }: { label: string; isDark: boolean; onPress?: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="flex-1 active:opacity-80">
      <View
        className="flex-row items-center justify-center rounded-2xl border py-3"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        }}
      >
        {children}
        <Text className="ml-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</Text>
      </View>
    </Pressable>
  );
}

export default function SocialButtons({ isDark, onGoogle, onApple }: SocialButtonsProps) {
  return (
    <View>
      <Divider isDark={isDark} />

      <View className="mt-4 flex-row" style={{ gap: 12 }}>
        <SocialButton label="Google" isDark={isDark} onPress={onGoogle}>
          <View className="size-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700">
            <Text className="text-xs font-bold text-[#4285F4]">G</Text>
          </View>
        </SocialButton>

        <SocialButton label="Apple" isDark={isDark} onPress={onApple}>
          <Apple size={18} color={isDark ? '#f4f4f5' : '#18181b'} fill={isDark ? '#f4f4f5' : '#18181b'} />
        </SocialButton>
      </View>
    </View>
  );
}
