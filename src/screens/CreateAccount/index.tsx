import { Lock, Mail } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import AuthField from '../Login/components/AuthField';
import AuthHeader from '../Login/components/AuthHeader';
import AuthTabs from '../Login/components/AuthTabs';
import SwipeButton from '../Login/components/SwipeButton';

type CreateAccountProps = {
  onCreateAccount?: (payload: { email: string; password: string }) => void;
  onNavigateToLogin?: () => void;
  pending?: boolean;
};

export default function CreateAccount({ onCreateAccount, onNavigateToLogin, pending = false }: CreateAccountProps) {
  const isDark = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0 && password === confirmPassword, [email, password, confirmPassword]);

  const handleCreate = () => {
    if (!canSubmit) return;
    onCreateAccount?.({ email: email.trim(), password });
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <AuthHeader title="Criar conta" subtitle="Comece agora e organize seus dias com mais foco." />

          <View className="px-6 pt-6">
            <AuthTabs active="signup" onChange={(tab) => tab === 'login' && onNavigateToLogin?.()} isDark={isDark} />

            <View className="mt-6" style={{ gap: 18 }}>
              <AuthField label="E-mail" placeholder="Digite seu e-mail" value={email} onChangeText={setEmail} Icon={Mail} isDark={isDark} keyboardType="email-address" />
              <AuthField label="Senha" placeholder="Digite sua senha" value={password} onChangeText={setPassword} Icon={Lock} isDark={isDark} secure />
              <AuthField label="Confirmar senha" placeholder="Confirme sua senha" value={confirmPassword} onChangeText={setConfirmPassword} Icon={Lock} isDark={isDark} secure />
            </View>

            <View className="mt-8">
              <SwipeButton label={pending ? 'Criando...' : 'Criar conta'} onPress={handleCreate} disabled={!canSubmit || pending} />
            </View>

            {/*
            <View className="mt-7">
              <SocialButtons isDark={isDark} />
            </View>
            */}

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">Já tem uma conta? </Text>
              <Pressable onPress={onNavigateToLogin} accessibilityRole="button" className="active:opacity-70">
                <Text className="text-sm font-semibold text-[#6366f1]">Entrar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
