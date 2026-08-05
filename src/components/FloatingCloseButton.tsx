/**
 * Botão de fechar flutuante sobre conteúdo que sangra até o topo (ilustrações,
 * gradientes).
 *
 * Por padrão assume que já está dentro de um `SafeAreaView` (como o de
 * `ModalScreen`) e só aplica um respiro de 12px — somar o inset de novo
 * empurraria o X para baixo demais. Use `respectInsets` quando o botão flutua
 * sobre uma tela sem padding de safe area (aí o inset real substitui o
 * antigo `top-14` chutado).
 */

import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FloatingCloseButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  color?: string;
  /** Cor de fundo do alvo de toque. */
  backgroundColor?: string;
  /**
   * Quando true, posiciona pelo inset superior do provider (tela sem
   * SafeAreaView). Default false: já estamos dentro de uma área segura.
   */
  respectInsets?: boolean;
};

/** Respiro mínimo em aparelhos onde o inset superior é 0. */
const MIN_TOP = 12;

export default function FloatingCloseButton({ onPress, accessibilityLabel = 'Fechar', color = 'white', backgroundColor = 'rgba(255,255,255,0.4)', respectInsets = false }: FloatingCloseButtonProps) {
  const insets = useSafeAreaInsets();
  const top = respectInsets ? Math.max(insets.top, MIN_TOP) : MIN_TOP;

  return (
    <View className="absolute right-4 z-10" style={{ top }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} className="size-10 items-center justify-center rounded-full active:opacity-70" style={{ backgroundColor }}>
        <X size={20} color={color} />
      </Pressable>
    </View>
  );
}
