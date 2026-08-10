/**
 * Último recorte de assinatura e perfil de sono recebido em `GET /home`.
 *
 * `useSubscription` e `useSleepProfile` mantêm cache local próprio e semântica
 * offline própria, então continuam donos do seu estado. O que muda é a origem
 * do dado: se a Home acabou de trazer a informação, eles a consomem daqui em
 * vez de repetir `GET /subscription` e `GET /sleep-profile` no mesmo boot.
 */

import type { SleepProfileData } from '@/lib/sleepProfile/apply';
import type { SubscriptionStatus } from '@/lib/subscription/types';

/** Janela em que o snapshot ainda é considerado fresco. */
const MAX_AGE_MS = 30_000;

type Snapshot<T> = { value: T; at: number };

let subscription: Snapshot<SubscriptionStatus> | null = null;
let sleepProfile: Snapshot<SleepProfileData | null> | null = null;

function read<T>(snapshot: Snapshot<T> | null): T | undefined {
  if (!snapshot) return undefined;
  return Date.now() - snapshot.at <= MAX_AGE_MS ? snapshot.value : undefined;
}

export function setHomeSnapshot(payload: { subscription?: SubscriptionStatus | null; sleepProfile?: SleepProfileData | null }): void {
  const at = Date.now();
  if (payload.subscription) subscription = { value: payload.subscription, at };
  // `null` é resposta legítima (usuário sem perfil), então só a ausência da
  // chave significa "a Home não trouxe isso".
  if (payload.sleepProfile !== undefined) sleepProfile = { value: payload.sleepProfile, at };
}

export function takeSubscriptionSnapshot(): SubscriptionStatus | undefined {
  return read(subscription);
}

export function takeSleepProfileSnapshot(): SleepProfileData | null | undefined {
  return read(sleepProfile);
}

/** Descarta os snapshots — usado no logout, para não vazar dados entre contas. */
export function clearHomeSnapshot(): void {
  subscription = null;
  sleepProfile = null;
}
