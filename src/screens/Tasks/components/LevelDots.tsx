import { View } from 'react-native';

// import type { LucideIcon } from 'lucide-react-native';

const LEVEL_DOTS = [1, 2, 3, 4, 5] as const;

export default function LevelDots({ value, accent, isDark }: any) {
  const emptyColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';

  return (
    <View className="flex-row items-center">
      {LEVEL_DOTS.map((level) => (
        <View
          key={level}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            marginRight: level === LEVEL_DOTS.length ? 0 : 3,
            backgroundColor: level <= value ? accent : emptyColor,
          }}
        />
      ))}
    </View>
  );
}
