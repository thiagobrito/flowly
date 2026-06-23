import { Bell, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

type NotificationTestModalProps = {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
  onShowNow: () => void;
  onShowIn30Seconds: () => void;
};

type ActionRowProps = {
  label: string;
  isDark: boolean;
  onPress: () => void;
};

function ActionRow({ label, isDark, onPress }: ActionRowProps) {
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7';
  const background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 active:opacity-80" style={{ borderColor: border, backgroundColor: background }}>
      <Text className="text-base font-medium text-zinc-900 dark:text-zinc-50">{label}</Text>
    </Pressable>
  );
}

export default function NotificationTestModal({ visible, isDark, onClose, onShowNow, onShowIn30Seconds }: NotificationTestModalProps) {
  const handleShowNow = () => {
    onClose();
    onShowNow();
  };

  const handleShowIn30Seconds = () => {
    onClose();
    onShowIn30Seconds();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fechar" />

        <View className="rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">Testar notificação</Text>
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

          <View className="mb-4 flex-row items-center rounded-2xl border px-4 py-3.5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
            <View className="mr-3 size-10 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }}>
              <Bell size={20} color="#6366f1" />
            </View>
            <Text className="flex-1 text-sm text-zinc-500 dark:text-zinc-400">Dispara uma notificação local de teste, sem afetar os lembretes de tarefas.</Text>
          </View>

          <ActionRow label="Mostrar notificação agora" isDark={isDark} onPress={handleShowNow} />
          <ActionRow label="Mostrar notificação em 30 segundos" isDark={isDark} onPress={handleShowIn30Seconds} />
        </View>
      </View>
    </Modal>
  );
}
