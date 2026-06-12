import { Info } from 'lucide-react-native';
import { Text, View } from 'react-native';

export default function FocusCard({ isDark }: { isDark: boolean }) {
  return (
    <View
      className="flex-row rounded-2xl border p-4"
      style={{
        borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
        backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
      }}
    >
      <Info size={18} color="#3b82f6" style={{ marginTop: 1 }} />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">Mantenha o Foco</Text>
        <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">Mudar de metas com muita frequência reduz a execução e o progresso. Recomendamos manter suas metas até o fim do ciclo atual de 12 semanas.</Text>
      </View>
    </View>
  );
}
