/**
 * # Atribuição da Meta
 *
 * Devolve para a Meta o sinal de que alguém instalou o app e criou conta.
 *
 * Sem esse retorno o leilão de anúncios só consegue otimizar o que enxerga — o
 * clique — e nunca aprende a procurar quem instala. É também o único jeito de
 * ligar uma instalação ao anúncio que a originou: a telemetria própria
 * (`lib/telemetry`) sabe que houve uma primeira abertura, mas não de onde ela
 * veio.
 *
 * ## Quando não faz nada
 *
 * Os dois pacotes exigem código nativo linkado, e o SDK da Meta só entra no
 * build quando `META_APP_ID` e `META_CLIENT_TOKEN` estão definidos (ver
 * `app.config.js`). Por isso o `require` é adiado e protegido, como em
 * `lib/notifications/native`: sem o native — web, Expo Go, build sem as
 * credenciais — tudo aqui vira no-op silencioso. Importar no topo derrubava o
 * app inteiro com `Cannot find native module 'ExpoTrackingTransparency'`.
 *
 * Para o SDK da Meta adiar o `require` não basta: o barrel do pacote reexporta
 * `AccessToken`, cujo módulo já na carga constrói um `NativeEventEmitter` sobre
 * o módulo nativo. Sem o native isso é um invariant violation que o Metro
 * reporta como fatal antes de qualquer `catch` daqui — foi o que derrubou o app
 * no boot da 2026.08.12. Daí consultar `NativeModules` como porteiro, no mesmo
 * espírito de `lib/subscription/client`.
 *
 * ## Privacidade
 *
 * No iOS nada é enviado com identificador de anúncio antes do consentimento do
 * ATT. Quando a pessoa recusa, o SDK segue ativo em modo não rastreado — a Meta
 * ainda conta a instalação de forma agregada, via SKAdNetwork, sem identificar
 * ninguém.
 */

import type * as ExpoTrackingTransparency from 'expo-tracking-transparency';
import { NativeModules, Platform } from 'react-native';
import type * as MetaSdk from 'react-native-fbsdk-next';

type TrackingModule = typeof ExpoTrackingTransparency;
type MetaSdkModule = typeof MetaSdk;

/** Nome do evento padrão de cadastro no catálogo da Meta. */
const COMPLETE_REGISTRATION = 'fb_mobile_complete_registration';

let trackingModule: TrackingModule | null | undefined;
let metaSdkModule: MetaSdkModule | null | undefined;
let initialized = false;

function getTracking(): TrackingModule | null {
  if (trackingModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      trackingModule = require('expo-tracking-transparency') as TrackingModule;
    } catch {
      trackingModule = null;
    }
  }
  return trackingModule;
}

/**
 * `true` quando o binário nativo inclui os módulos do SDK da Meta. Precisa ser
 * verdade antes do `require`: ver o cabeçalho deste arquivo.
 */
function isMetaNativeAvailable(): boolean {
  return Boolean(NativeModules.FBSettings && NativeModules.FBAccessToken && NativeModules.FBAppEventsLogger);
}

function getMetaSdk(): MetaSdkModule | null {
  if (metaSdkModule === undefined) {
    metaSdkModule = null;

    if (isMetaNativeAvailable()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
        metaSdkModule = require('react-native-fbsdk-next') as MetaSdkModule;
      } catch {
        metaSdkModule = null;
      }
    }
  }
  return metaSdkModule;
}

async function hasTrackingConsent(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;

  const tracking = getTracking();
  if (!tracking) return false;

  const { status } = await tracking.getTrackingPermissionsAsync();
  return status === 'granted';
}

/**
 * Inicializa o SDK refletindo o consentimento que já existe. Idempotente e
 * silencioso: nenhum alerta é aberto aqui.
 *
 * Roda no boot para que a instalação seja contada mesmo de quem nunca cria
 * conta — sem identificador, agregada pelo SKAdNetwork.
 */
export async function initAttribution(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const meta = getMetaSdk();
  if (!meta) return;

  try {
    meta.Settings.initializeSDK();
    await meta.Settings.setAdvertiserTrackingEnabled(await hasTrackingConsent());
  } catch {
    // Atribuição é acessório: nunca pode impedir o app de abrir.
  }
}

/**
 * Pede o consentimento de rastreamento do iOS (ATT).
 *
 * Chame depois do cadastro, nunca na primeira abertura: o sistema só permite
 * perguntar uma vez por instalação, e gastar essa única chance com alguém que
 * ainda não viu o app garante a recusa. Quem acabou de criar conta já sabe o
 * que está aceitando.
 */
export async function requestAttributionConsent(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const tracking = getTracking();
  if (!tracking) return;

  try {
    const current = await tracking.getTrackingPermissionsAsync();
    if (current.status !== 'undetermined' || !current.canAskAgain) return;

    const answered = await tracking.requestTrackingPermissionsAsync();
    await getMetaSdk()?.Settings.setAdvertiserTrackingEnabled(answered.status === 'granted');
  } catch {
    // Ver acima.
  }
}

/** Restaura os caches de disponibilidade e o controle de idempotência. Útil em testes. */
export function resetAttributionCacheForTests(): void {
  trackingModule = undefined;
  metaSdkModule = undefined;
  initialized = false;
}

/** Registra na Meta que uma conta foi criada. */
export function trackSignupCompleted(): void {
  try {
    getMetaSdk()?.AppEventsLogger.logEvent(COMPLETE_REGISTRATION);
  } catch {
    // Ver acima: falha de atribuição não interrompe o cadastro.
  }
}
