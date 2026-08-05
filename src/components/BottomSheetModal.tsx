/**
 * # BottomSheetModal
 *
 * Sheet ancorado no rodapé, com inset inferior real em vez de padding chutado.
 *
 * Mesma armadilha descrita em `ModalScreen`: `SafeAreaView` é nativa e precisa
 * de um `SafeAreaProvider` na mesma hierarquia do `Modal`. Sem ele o inset vem
 * zerado e os sheets acabam usando um `pb-10` fixo, que sobra em aparelhos com
 * botão físico e falta nos com home indicator.
 */

import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  closeLabel?: string;
  isDark?: boolean;
  children: ReactNode;
};

export default function BottomSheetModal({ visible, onClose, closeLabel = 'Fechar', isDark = false, children }: BottomSheetModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaProvider>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-3xl border-t px-4 pt-4"
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
          >
            {/* eslint-disable-next-line no-restricted-syntax -- o SafeAreaProvider
                acima é justamente o que torna este SafeAreaView funcional. */}
            <SafeAreaView edges={['bottom']}>
              {children}
              {/* Respiro mínimo em aparelhos sem home indicator, onde o inset é 0. */}
              <View className="h-4" />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </SafeAreaProvider>
    </Modal>
  );
}
