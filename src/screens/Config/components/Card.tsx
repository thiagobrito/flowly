import type { ReactNode } from 'react';
import { View } from 'react-native';

export default function Card({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <View
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
      }}
    >
      {children}
    </View>
  );
}
