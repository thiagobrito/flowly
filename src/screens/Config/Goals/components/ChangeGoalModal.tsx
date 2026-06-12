import { Check, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { CHANGE_ACTIONS, CHANGE_REASONS } from '../data';

type ChangeGoalModalProps = {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
  onConfirm: (reason: string, action: string) => void;
};

type OptionRowProps = {
  label: string;
  selected: boolean;
  isDark: boolean;
  onPress: () => void;
};

function optionColors(selected: boolean, isDark: boolean) {
  if (selected) {
    return {
      border: '#6366f1',
      background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
      text: '#6366f1',
    };
  }
  return {
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
    text: isDark ? '#fafafa' : '#18181b',
  };
}

function OptionRow({ label, selected, isDark, onPress }: OptionRowProps) {
  const colors = optionColors(selected, isDark);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3.5 active:opacity-80"
      style={{ borderColor: colors.border, backgroundColor: colors.background }}
    >
      <Text className="flex-1 pr-3 text-[15px] font-medium" style={{ color: colors.text }}>
        {label}
      </Text>
      {selected ? <Check size={18} color="#6366f1" /> : null}
    </Pressable>
  );
}

export default function ChangeGoalModal({ visible, isDark, onClose, onConfirm }: ChangeGoalModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setReason(null);
      setAction(null);
    }
  }, [visible]);

  const canContinue = step === 1 ? reason !== null : action !== null;

  const handlePrimary = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (reason && action) onConfirm(reason, action);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fechar" />

        <View className="rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
          <View className="mb-4 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">{step === 1 ? 'Por que você quer mudar esta meta?' : 'O que você gostaria de fazer?'}</Text>
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

          {step === 1
            ? CHANGE_REASONS.map((item) => <OptionRow key={item} label={item} selected={reason === item} isDark={isDark} onPress={() => setReason(item)} />)
            : CHANGE_ACTIONS.map((item) => <OptionRow key={item} label={item} selected={action === item} isDark={isDark} onPress={() => setAction(item)} />)}

          <Pressable onPress={handlePrimary} disabled={!canContinue} accessibilityRole="button" className="mt-3 items-center rounded-2xl py-3.5 active:opacity-85" style={{ backgroundColor: '#6366f1', opacity: canContinue ? 1 : 0.4 }}>
            <Text className="text-base font-semibold text-white">{step === 1 ? 'Continuar' : 'Confirmar'}</Text>
          </Pressable>

          {step === 2 ? (
            <Pressable onPress={() => setStep(1)} accessibilityRole="button" className="mt-2 items-center py-2.5 active:opacity-70">
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Voltar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
