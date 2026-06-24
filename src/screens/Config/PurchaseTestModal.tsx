import { Crown, X } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

type PurchaseTestModalProps = {
  visible: boolean;
  busy: boolean;
  isDark: boolean;
  onClose: () => void;
  onShowPaywall: () => void;
  onPurchaseMonthly: () => void;
  onPurchaseYearly: () => void;
  onRestore: () => void;
};

type ActionRowProps = {
  label: string;
  isDark: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function ActionRow({ label, isDark, disabled, onPress }: ActionRowProps) {
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7';
  const background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      className="mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 active:opacity-80"
      style={{ borderColor: border, backgroundColor: background, opacity: disabled ? 0.5 : 1 }}
    >
      <Text className="text-base font-medium text-zinc-900 dark:text-zinc-50">{label}</Text>
    </Pressable>
  );
}

export default function PurchaseTestModal({ visible, busy, isDark, onClose, onShowPaywall, onPurchaseMonthly, onPurchaseYearly, onRestore }: PurchaseTestModalProps) {
  const run = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fechar" />

        <View className="rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">Testar compra</Text>
            {busy ? <ActivityIndicator color={isDark ? '#e4e4e7' : '#6366f1'} /> : null}
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
            <View className="mr-3 size-10 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.08)' }}>
              <Crown size={20} color="#eab308" />
            </View>
            <Text className="flex-1 text-sm text-zinc-500 dark:text-zinc-400">Fluxo manual de compra via RevenueCat. Só dispara ao tocar em uma opção abaixo.</Text>
          </View>

          <ActionRow label="Abrir paywall" isDark={isDark} disabled={busy} onPress={() => run(onShowPaywall)} />
          <ActionRow label="Comprar flowly_montly" isDark={isDark} disabled={busy} onPress={() => run(onPurchaseMonthly)} />
          <ActionRow label="Comprar flowly_yearly" isDark={isDark} disabled={busy} onPress={() => run(onPurchaseYearly)} />
          <ActionRow label="Restaurar compras" isDark={isDark} disabled={busy} onPress={() => run(onRestore)} />
        </View>
      </View>
    </Modal>
  );
}
