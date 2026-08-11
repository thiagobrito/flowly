/**
 * Estado local injetado antes do boot do app.
 *
 * No web o `AsyncStorage` é o `localStorage` com a chave literal, e a lib de
 * storage guarda o JSON do valor direto na chave. Isso permite abrir o app já
 * autenticado e com onboarding concluído, sem repetir login em cada spec — o que
 * dominaria o tempo da suíte.
 *
 * As chaves vêm de `src/lib/*`; mudar uma delas lá quebra estes testes, que é
 * exatamente o aviso desejado.
 */

/** Dia civil local, no mesmo formato que `localDateKey()` do app. */
export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayKeyOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

export type LocalStateOptions = {
  /** `null` remove a sessão (usado nos testes de guard de rota). */
  token?: string | null;
  email?: string;
  /** `false` força o app a mandar para `/onboarding`. */
  onboardingCompleted?: boolean;
  /** `false` deixa o perfil de sono vazio, que dispara o prompt automático. */
  sleepConfigured?: boolean;
  /** Passo do onboarding a retomar, evitando percorrer os 12 para testar um. */
  onboardingStep?: number;
  theme?: 'light' | 'dark' | 'system';
  energyMode?: 'ideal' | 'low' | 'rushed';
};

export type LocalState = Record<string, string>;

/** Monta o conteúdo do `localStorage` para um cenário. */
export function buildLocalState(options: LocalStateOptions = {}): LocalState {
  const { token = 'E2E_TOKEN', email = 'e2e@flowly.app', onboardingCompleted = true, sleepConfigured = true, theme = 'light', energyMode, onboardingStep } = options;

  const state: LocalState = {
    onboarding_v2: JSON.stringify({ completed: onboardingCompleted, language: 'pt-BR' }),
    // Aqui o valor é a string crua, não JSON: `useThemePreference` lê o modo
    // direto da chave e ignora qualquer coisa fora de system/light/dark.
    theme_mode_v1: theme,
    // Identidade fixa de telemetria: sem ela o app gera um device_id novo por
    // spec e o lote de eventos deixa de ser comparável.
    telemetry_device_v1: JSON.stringify({ deviceId: 'e2e-device', firstOpenSent: true }),
  };

  if (token !== null) {
    state.auth_session_v1 = JSON.stringify({ token, email });
  }

  if (sleepConfigured) {
    // `isSleepProfileConfigured` exige os dois horários usuais; sem eles a Home
    // pula sozinha para Estatísticas e abre o modal de sono.
    state.sleep_profile_v1 = JSON.stringify({ hasDevice: false, usualWakeTime: '07:00', usualBedTime: '23:00', overrides: {} });
  }

  if (energyMode) {
    state.energy_mode_v1 = JSON.stringify({ dateKey: todayKey(), mode: energyMode });
  }

  if (onboardingStep !== undefined) {
    state.onboarding_progress_v1 = JSON.stringify({ index: onboardingStep, goalSetup: null, activities: [] });
  }

  return state;
}
