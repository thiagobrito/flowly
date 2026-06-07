import type { ReactNode } from 'react';

export type TodayFocusScreenProps<T> = {
  /** Itens exibidos no deck, um card por item. */
  items: T[];
  /** Índice inicial focado (clamped para [0, items.length - 1]). Default 0. */
  initialIndex?: number;
  /** Gera a key estável de cada card. Default: índice. */
  keyExtractor?: (item: T, index: number) => string;
  /** Conteúdo do card de cada item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Footer opcional abaixo do deck, dependente do item focado. */
  renderFooter?: (item: T, index: number) => ReactNode | null;
  /** Disparado ao fim do snap, quando um novo item fica centralizado. */
  onIndexChange?: (index: number, item: T) => void;
  /** Título fixo do header. Default "Today". */
  title?: string;
  /** Subtítulo fixo do header. */
  subtitle?: string;
  /** Toque no botão de ajustes do header. */
  onSettingsPress?: () => void;
};
