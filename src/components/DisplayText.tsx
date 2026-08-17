/**
 * Texto na serifada de display.
 *
 * É o único caminho para a Fraunces. Uma classe utilitária do NativeWind
 * (`font-display`) aplicaria o `fontFamily` mesmo antes de o arquivo carregar,
 * e cada tela teria que lembrar de tratar esse intervalo; aqui o fallback para
 * a fonte do sistema é automático, porque `displayFont()` devolve `undefined`
 * enquanto o carregamento não termina (ver `lib/theme/fonts`).
 */

import { Text, type TextProps } from 'react-native';

import { displayFont, type DisplayWeight } from '@/lib/theme';

type DisplayTextProps = TextProps & {
  weight?: DisplayWeight;
};

export default function DisplayText({ weight = 'semibold', style, ...props }: DisplayTextProps) {
  return <Text {...props} style={[{ fontFamily: displayFont(weight) }, style]} />;
}
