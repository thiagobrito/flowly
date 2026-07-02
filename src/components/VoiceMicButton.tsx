import { LinearGradient } from 'expo-linear-gradient';
import { Mic } from 'lucide-react-native';
import { Pressable, useColorScheme } from 'react-native';

type VoiceMicButtonProps = {
  /** Abre o assistente de voz (toque ou segurar). */
  onActivate: () => void;
};

/**
 * Botão de microfone flutuante, visível em todas as abas da Home. Segurar
 * (ou tocar) abre o assistente de voz para criar tarefas falando.
 */
export default function VoiceMicButton({ onActivate }: VoiceMicButtonProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      onPress={onActivate}
      onLongPress={onActivate}
      accessibilityRole="button"
      accessibilityLabel="Assistente de voz"
      accessibilityHint="Segure para falar e criar uma tarefa por voz"
      className="absolute bottom-24 right-2 active:opacity-80"
      style={{ zIndex: 20 }}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.6 : 0.4,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Mic size={26} color="#ffffff" strokeWidth={2.2} />
      </LinearGradient>
    </Pressable>
  );
}
