import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

type CountdownProps = {
  seconds: number;
  isDark: boolean;
  /** Chamado uma única vez quando o contador chega a zero. */
  onExpire: () => void;
  /** `blocks` destaca minutos e segundos em caixas separadas. */
  variant?: 'inline' | 'blocks';
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Contagem regressiva da oferta. Ao zerar, avisa o funil para seguir adiante —
 * a oferta não fica valendo indefinidamente depois do prazo anunciado.
 */
export default function Countdown({ seconds, isDark, onExpire, variant = 'inline' }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  // Avisar fora do updater de estado evita disparar o avanço do funil duas
  // vezes quando o React reexecuta a atualização.
  useEffect(() => {
    if (remaining > 0) return;
    expireRef.current();
  }, [remaining]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (variant === 'blocks') {
    const blockBg = isDark ? '#18181b' : '#27272a';

    return (
      <View className="flex-row items-center justify-center">
        {[pad(minutes), pad(secs)].map((value, index) => (
          <View key={value + String(index)} className="flex-row items-center">
            {index > 0 ? (
              <Text className="px-2 text-2xl font-bold" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
                :
              </Text>
            ) : null}
            <View className="items-center">
              <View className="flex-row">
                {value.split('').map((digit, digitIndex) => (
                  <View key={String(digitIndex) + digit} className="mx-0.5 items-center justify-center rounded-xl px-3 py-2" style={{ backgroundColor: blockBg }}>
                    <Text className="text-2xl font-bold text-white">{digit}</Text>
                  </View>
                ))}
              </View>
              <Text className="mt-1 text-[11px]" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                {index === 0 ? 'Minutos' : 'Segundos'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="self-center rounded-full border px-3 py-1" style={{ borderColor: '#f97316' }}>
      <Text className="text-xs font-semibold" style={{ color: '#f97316' }}>
        expira em {pad(minutes)}:{pad(secs)}
      </Text>
    </View>
  );
}
