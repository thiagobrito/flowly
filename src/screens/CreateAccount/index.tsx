import { Lock, Mail } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { openLegalLink, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/lib/legal';

import AuthField from '../Login/components/AuthField';
import AuthHeader from '../Login/components/AuthHeader';
import AuthTabs from '../Login/components/AuthTabs';
import Checkbox from '../Login/components/Checkbox';
import SwipeButton from '../Login/components/SwipeButton';

type CreateAccountProps = {
  onCreateAccount?: (payload: { email: string; password: string }) => void;
  onNavigateToLogin?: () => void;
  pending?: boolean;
};

const MIN_PASSWORD_LENGTH = 8;

/** Validação leve de formato (o backend continua sendo a autoridade final). */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export default function CreateAccount({ onCreateAccount, onNavigateToLogin, pending = false }: CreateAccountProps) {
  const isDark = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const trimmedEmail = email.trim();
  const emailError = trimmedEmail.length > 0 && !isValidEmail(trimmedEmail) ? 'Informe um e-mail válido.' : null;
  const passwordError = password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` : null;
  const confirmError = confirmPassword.length > 0 && password !== confirmPassword ? 'As senhas não coincidem.' : null;

  const canSubmit = useMemo(() => isValidEmail(trimmedEmail) && password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword && consentAccepted, [trimmedEmail, password, confirmPassword, consentAccepted]);

  const handleCreate = () => {
    if (!canSubmit) return;
    onCreateAccount?.({ email: trimmedEmail, password });
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <AuthHeader title="Criar conta" subtitle="Comece agora e organize seus dias com mais foco." />

          <View className="px-6 pt-6">
            <AuthTabs active="signup" onChange={(tab) => tab === 'login' && onNavigateToLogin?.()} isDark={isDark} />

            <View className="mt-6" style={{ gap: 18 }}>
              <View>
                <AuthField label="E-mail" placeholder="Digite seu e-mail" value={email} onChangeText={setEmail} Icon={Mail} isDark={isDark} keyboardType="email-address" />
                {emailError ? <Text className="mt-1.5 text-xs text-red-500">{emailError}</Text> : null}
              </View>
              <View>
                <AuthField label="Senha" placeholder="Digite sua senha" value={password} onChangeText={setPassword} Icon={Lock} isDark={isDark} secure />
                {passwordError ? <Text className="mt-1.5 text-xs text-red-500">{passwordError}</Text> : null}
              </View>
              <View>
                <AuthField label="Confirmar senha" placeholder="Confirme sua senha" value={confirmPassword} onChangeText={setConfirmPassword} Icon={Lock} isDark={isDark} secure />
                {confirmError ? <Text className="mt-1.5 text-xs text-red-500">{confirmError}</Text> : null}
              </View>
            </View>

            <View className="mt-5">
              <View className="flex-row items-start">
                <Checkbox label="" checked={consentAccepted} onChange={setConsentAccepted} isDark={isDark} />
                <Text className="-ml-1 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  Li e concordo com a{' '}
                  <Text className="font-semibold text-[#6366f1]" onPress={() => openLegalLink(PRIVACY_POLICY_URL)} accessibilityRole="link">
                    Política de Privacidade
                  </Text>{' '}
                  e os{' '}
                  <Text className="font-semibold text-[#6366f1]" onPress={() => openLegalLink(TERMS_OF_USE_URL)} accessibilityRole="link">
                    Termos de Uso
                  </Text>
                  .
                </Text>
              </View>
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
