import { CheckCircle2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import Card from '../../components/Card';
import type { HistoryCycle } from '../data';

type HistoryCardProps = {
  history: HistoryCycle[];
  isDark: boolean;
};

export default function HistoryCard({ history, isDark }: HistoryCardProps) {
  return (
    <Card isDark={isDark}>
      <View className="p-4">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Histórico de Metas</Text>

        <View className="mt-3">
          {history.map((item, index) => (
            <View key={item.id} className="flex-row">
              {/* Linha do tempo */}
              <View className="items-center">
                <CheckCircle2 size={18} color="#10b981" />
                {index < history.length - 1 ? <View className="my-1 w-px flex-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} /> : null}
              </View>

              <View className="ml-3 flex-1" style={index < history.length - 1 ? { paddingBottom: 16 } : undefined}>
                <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Ciclo {item.cycle}</Text>
                <Text className="mt-0.5 text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{item.goal}</Text>
                <Text className="mt-0.5 text-sm" style={{ color: '#10b981' }}>
                  {item.status === 'completed' ? 'Concluído' : 'Arquivado'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
