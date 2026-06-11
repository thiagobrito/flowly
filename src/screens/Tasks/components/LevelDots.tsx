import { View } from 'react-native';

// import type { LucideIcon } from 'lucide-react-native';

const LEVEL_DOTS = [1, 2, 3, 4, 5] as const;

export default function LevelDots({ value, accent, isDark, big = false }: any) {
  const emptyColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
  const size = big ? 'size-3' : 'size-1.5';

  return (
    <View className="flex-row items-center">
      {LEVEL_DOTS.map((level) => (
        <View
          key={level}
          className={`${size} rounded-full ${level <= value ? 'bg-green-800/80' : 'bg-red-800/80'}`}
          style={{
            marginRight: level === LEVEL_DOTS.length ? 0 : 3,
            backgroundColor: level <= value ? accent : emptyColor,
          }}
        />
      ))}
    </View>
  );
}
