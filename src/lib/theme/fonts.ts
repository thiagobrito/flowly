/**
 * # Fonte de display
 *
 * Uma serifada (Fraunces) para o wordmark e para os títulos de tela — "Hoje",
 * "Metas", "Como foi seu sono?". O corpo continua na fonte do sistema: ela é a
 * que o usuário já lê o dia inteiro, e trocá-la custaria legibilidade sem
 * ganhar identidade.
 *
 * Este arquivo não importa `expo-font` de propósito. Ele é lido pelo barrel de
 * `lib/theme`, que praticamente toda tela importa; puxar um módulo nativo junto
 * faria cada teste de componente precisar de mock para descobrir a cor de um
 * chip. O carregamento mora em `useDisplayFont`, que só o layout raiz importa.
 */

export const DISPLAY_FONT = {
  semibold: 'Fraunces_600SemiBold',
  bold: 'Fraunces_700Bold',
} as const;

export type DisplayWeight = keyof typeof DISPLAY_FONT;

let loaded = false;

/** Marca a serifada como disponível. Chamado por `useDisplayFont`. */
export function setDisplayFontLoaded(value: boolean): void {
  loaded = loaded || value;
}

/**
 * `fontFamily` da serifada, ou `undefined` enquanto ela não carregou.
 *
 * `undefined` é intencional: no estilo do React Native ele significa "herda o
 * padrão", então o texto aparece na fonte do sistema em vez de sumir. Segurar a
 * árvore até a fonte resolver transformaria um detalhe estético em tela branca.
 */
export function displayFont(weight: DisplayWeight = 'semibold'): string | undefined {
  return loaded ? DISPLAY_FONT[weight] : undefined;
}
