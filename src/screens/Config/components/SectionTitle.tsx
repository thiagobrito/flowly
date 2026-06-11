import { Text } from 'react-native';

export default function SectionTitle({ children, isDark }: { children: string; isDark: boolean }) {
  return (
    <Text className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
      {children}
    </Text>
  );
}
