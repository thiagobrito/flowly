import type { DeepPartial, ThemeConfigs } from '@howljs/calendar-kit';

/**
 * Tema do calendário alinhado ao restante do app (paleta zinc + acento
 * indigo/azul), reagindo ao modo claro/escuro. O fundo é transparente para
 * deixar o `LinearGradient` global aparecer.
 */
export function buildCalendarTheme(isDark: boolean): DeepPartial<ThemeConfigs> {
  return {
    colors: {
      primary: isDark ? '#818cf8' : '#6366f1',
      onPrimary: '#ffffff',
      background: 'transparent',
      onBackground: isDark ? '#fafafa' : '#18181b',
      border: isDark ? '#3f3f46' : '#e4e4e7',
      text: isDark ? '#fafafa' : '#18181b',
      surface: isDark ? '#18181b' : '#f4f4f5',
      onSurface: isDark ? '#a1a1aa' : '#52525b',
    },
    hourTextStyle: { fontSize: 12, fontWeight: '600', color: isDark ? '#a1a1aa' : '#71717a' },
    dayName: { color: isDark ? '#a1a1aa' : '#71717a', fontWeight: '600' },
    dayNumber: { color: isDark ? '#fafafa' : '#18181b', fontWeight: '700' },
    todayName: { color: '#3b82f6', fontWeight: '700' },
    todayNumber: { color: '#ffffff', fontWeight: '700' },
    todayNumberContainer: { backgroundColor: '#3b82f6' },
    nowIndicatorColor: '#3b82f6',
    eventContainerStyle: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 },
    eventTitleStyle: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  };
}
