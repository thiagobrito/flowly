/**
 * Links legais oficiais do app (centralizados).
 *
 * Usados tanto na seção "Legal" das configurações quanto no fluxo de compra
 * (paywall), conforme exigência da App Store (Guideline 3.1.2(c)) para apps com
 * assinaturas auto-renováveis: o app precisa expor links funcionais para a
 * Política de Privacidade e para os Termos de Uso (EULA).
 */

import * as Sentry from '@sentry/react-native';
import * as WebBrowser from 'expo-web-browser';

export const PRIVACY_POLICY_URL = 'https://furqahh8duzndywu.public.blob.vercel-storage.com/politica_de_privacidade.pdf';

/** EULA padrão da Apple. Se um EULA customizado for criado, troque por essa URL. */
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Abre um link legal no navegador in-app, capturando falhas no Sentry. */
export async function openLegalLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    Sentry.captureException(error);
  }
}
