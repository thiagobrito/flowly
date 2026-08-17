/**
 * # Esquema de cores em vigor
 *
 * Fonte única para as duas metades do estilo do app:
 *
 * - as classes `dark:` do NativeWind, resolvidas pelo próprio NativeWind;
 * - os `style={{ ... }}` calculados em JS a partir de `isDark`, que são a maior
 *   parte da cor do Flowly (superfícies, faixas de energia, gráficos).
 *
 * Ler o `useColorScheme` do `react-native` para o segundo grupo parece
 * equivalente, mas não é: ele responde só ao sistema, enquanto as classes
 * `dark:` respondem também à preferência salva em Aparência. Quem escolhia
 * "Escuro" com o celular no claro via texto branco sobre fundo creme — metade
 * do app trocava de tema e a outra metade não.
 *
 * Com `system`, o NativeWind cai no esquema do sistema, então o comportamento
 * padrão continua sendo o do aparelho.
 */

import { useColorScheme } from 'nativewind';

export function useIsDark(): boolean {
  return useColorScheme().colorScheme === 'dark';
}
