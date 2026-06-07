import { View } from 'react-native';

type DotsIndicatorProps = {
  count: number;
  activeIndex: number;
};

export const DotsIndicator = ({ count, activeIndex }: DotsIndicatorProps) => {
  if (count <= 1) return null;

  return (
    <View
      className="absolute right-0 gap-2 pr-1"
      style={{ top: '50%', transform: [{ translateY: -((count * 16) / 2) }] }}
    >
      {Array.from({ length: count }, (_, slot) => (
        <View
          key={slot}
          className={
            slot === activeIndex
              ? 'h-2 w-2 rounded-full bg-zinc-800 dark:bg-zinc-100'
              : 'h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600'
          }
        />
      ))}
    </View>
  );
};
