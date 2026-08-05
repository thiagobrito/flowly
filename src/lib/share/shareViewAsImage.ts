/**
 * # Compartilhar uma view como imagem
 *
 * Captura um trecho da árvore com `react-native-view-shot` e entrega ao share
 * sheet do sistema via `expo-sharing`.
 *
 * Compartilhar texto puro (`Share.share`) não sobrevive fora do app: o recap
 * semanal só é postável como imagem. O resultado é um status, não um throw —
 * quem chama decide o que dizer ao usuário e o que registrar em telemetria, e
 * cancelar o share não é erro.
 */

import * as Sharing from 'expo-sharing';
import type { Component } from 'react';
import { captureRef } from 'react-native-view-shot';

export type ShareImageStatus = 'shared' | 'unavailable' | 'failed';

type ShareViewOptions = {
  /** Título do share sheet (Android) e diálogo. */
  dialogTitle?: string;
  /** Nome base do arquivo temporário. */
  fileName?: string;
};

export async function shareViewAsImage(target: Component | number | null, { dialogTitle, fileName = 'flowly' }: ShareViewOptions = {}): Promise<ShareImageStatus> {
  if (!target) return 'failed';

  try {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';

    const uri = await captureRef(target, { format: 'png', quality: 1, fileName, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    return 'shared';
  } catch {
    return 'failed';
  }
}
