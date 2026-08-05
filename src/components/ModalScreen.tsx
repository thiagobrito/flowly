/**
 * # ModalScreen
 *
 * Modal em tela cheia com safe area confiável.
 *
 * ## Por que este componente existe
 *
 * `SafeAreaView` do `react-native-safe-area-context` é uma **view nativa**, não
 * um componente que lê React Context. Ela sobe a cadeia `reactSuperview`
 * procurando um `RNCSafeAreaProvider` e, se não encontrar, **não aplica padding
 * nenhum — sem warning** (ver `findNearestProvider` em `ios/RNCSafeAreaView.m`).
 * O `Modal` do React Native monta seu conteúdo noutra hierarquia nativa, então
 * a cadeia quebra e o `SafeAreaProvider` da raiz do app fica inalcançável.
 *
 * O sintoma é uma tela cujo topo desaparece sob o notch: o header e o botão de
 * fechar ficam invisíveis e sem área de toque, deixando o usuário preso.
 *
 * A correção é declarar um `SafeAreaProvider` **dentro** do `Modal`. Este
 * componente encapsula isso para que nenhuma tela nova precise lembrar.
 */

import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type ModalScreenProps = {
  visible: boolean;
  onClose: () => void;
  /** Título do header padrão. Sem título, o header mostra apenas o X. */
  title?: string;
  accessibilityLabel?: string;
  /** Esconde o header padrão: a tela desenha o próprio (use `useSafeAreaInsets`). */
  hideHeader?: boolean;
  /** Cor de fundo da área segura. */
  backgroundColor?: string;
  /** Conteúdo atrás da safe area (gradientes, ilustrações de fundo). */
  backdrop?: ReactNode;
  isDark?: boolean;
  children: ReactNode;
};

export default function ModalScreen({ visible, onClose, title, accessibilityLabel = 'Fechar', hideHeader = false, backgroundColor, backdrop, isDark = false, children }: ModalScreenProps) {
  return (
    // `presentationStyle` fica no default (`fullScreen` no iOS). O X do header é
    // sempre renderizado dentro da safe area, então nunca há tela sem saída.
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View className="flex-1" style={backgroundColor ? { backgroundColor } : undefined}>
          {backdrop}

          {/* eslint-disable-next-line no-restricted-syntax -- o SafeAreaProvider
              acima é justamente o que torna este SafeAreaView funcional. */}
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            {hideHeader ? null : (
              <View className="flex-row items-center justify-between px-4 py-3">
                {title ? <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text> : <View />}

                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={accessibilityLabel}
                  className="size-10 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)' }}
                >
                  <X size={18} color={isDark ? '#e4e4e7' : '#27272a'} />
                </Pressable>
              </View>
            )}

            {children}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
