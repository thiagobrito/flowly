/** Estilos compartilhados pelos cartões de área de vida (seleção única e múltipla). */
export function areaBorderColor(selected: boolean, accent: string, isDark: boolean): string {
  if (selected) return accent;
  return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
}

export function areaBackgroundColor(selected: boolean, accent: string, isDark: boolean): string {
  if (selected) return `${accent}1a`;
  return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';
}

export function areaTextColor(selected: boolean, accent: string, isDark: boolean): string {
  if (selected) return accent;
  return isDark ? '#e4e4e7' : '#3f3f46';
}
