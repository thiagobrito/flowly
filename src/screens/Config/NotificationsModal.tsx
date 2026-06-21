import { BellRing, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

import SettingsToggle from './components/SettingsToggle';

type NotificationsModalProps = {
  visible: boolean;
  isDark: boolean;
  enabled: boolean;
  onChangeEnabled: (value: boolean) => void;
  onClose: () => void;
};

export default function NotificationsModal({ visible, isDark, enabled, onChangeEnabled, onClose }: NotificationsModalProps) {
  const rowBorder = isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7';
  const rowBackground = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fechar" />

        <View className="rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">Notificações</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              className="size-8 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <X size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
            </Pressable>
          </View>

          <View className="flex-row items-center rounded-2xl border px-4 py-3.5" style={{ borderColor: rowBorder, backgroundColor: rowBackground }}>
            <View className="mr-3 size-10 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }}>
              <BellRing size={20} color="#6366f1" />
            </View>
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-medium text-zinc-900 dark:text-zinc-50">Lembretes de tarefas</Text>
              <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Avisos 5 min antes e no horário de início das suas tarefas agendadas.</Text>
            </View>
            <SettingsToggle value={enabled} onValueChange={onChangeEnabled} isDark={isDark} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
