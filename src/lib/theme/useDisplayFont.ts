/**
 * Carregamento da serifada de display. Monte uma vez, no layout raiz.
 *
 * Fica separado de `fonts.ts` porque `expo-font` é módulo nativo: se ele
 * entrasse no barrel de `lib/theme`, toda tela que quer uma cor arrastaria o
 * módulo junto. Por isso este arquivo não é reexportado — o import é direto.
 */

import { Fraunces_600SemiBold, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';

import { DISPLAY_FONT, setDisplayFontLoaded } from './fonts';

/** `true` quando a serifada está pronta. Nenhuma tela deve esperar por isso. */
export function useDisplayFont(): boolean {
  const [fontsLoaded] = useFonts({
    [DISPLAY_FONT.semibold]: Fraunces_600SemiBold,
    [DISPLAY_FONT.bold]: Fraunces_700Bold,
  });

  setDisplayFontLoaded(fontsLoaded);
  return fontsLoaded;
}
