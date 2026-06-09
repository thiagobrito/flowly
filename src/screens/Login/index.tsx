import { Lock, Mail } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import AuthField from './components/AuthField';
import AuthHeader from './components/AuthHeader';
import AuthTabs from './components/AuthTabs';
import SwipeButton from './components/SwipeButton';

type LoginProps = {
  onLogin?: (payload: { email: string; password: string }) => void;
  onNavigateToCreateAccount?: () => void;
  pending?: boolean;
};

export default function Login({ onLogin, onNavigateToCreateAccount, pending = false }: LoginProps) {
  const isDark = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleLogin = () => {
    if (!canSubmit) return;
    onLogin?.({ email: email.trim(), password });
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <AuthHeader title="Bem-vindo de volta" subtitle="Entre para continuar organizando seu dia com clareza." />

          <View className="px-6 pt-6">
            <AuthTabs active="login" onChange={(tab) => tab === 'signup' && onNavigateToCreateAccount?.()} isDark={isDark} />

            <View className="mt-6" style={{ gap: 18 }}>
              <AuthField label="E-mail" placeholder="Digite seu e-mail" value={email} onChangeText={setEmail} Icon={Mail} isDark={isDark} keyboardType="email-address" />
              <AuthField label="Senha" placeholder="Digite sua senha" value={password} onChangeText={setPassword} Icon={Lock} isDark={isDark} secure />
            </View>

            {/*
            <View className="mt-4 flex-row items-center justify-between">
              <Checkbox label="Lembrar de mim" checked={remember} onChange={setRemember} isDark={isDark} />
              <Pressable onPress={onForgotPassword} accessibilityRole="button" className="active:opacity-70">
                <Text className="text-sm font-semibold text-[#6366f1]">Esqueceu a senha?</Text>
              </Pressable>
            </View>
            */}

            <View className="mt-7">
              <SwipeButton label={pending ? 'Entrando...' : 'Entrar'} onPress={handleLogin} disabled={!canSubmit || pending} />
            </View>

            {/*
            <View className="mt-7">
              <SocialButtons isDark={isDark} />
            </View>
            */}

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">Não tem uma conta? </Text>
              <Pressable onPress={onNavigateToCreateAccount} accessibilityRole="button" className="active:opacity-70">
                <Text className="text-sm font-semibold text-[#6366f1]">Criar conta</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
