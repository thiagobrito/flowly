/**
 * Invariantes que valem em qualquer tela.
 *
 * A ideia é que todo spec ganhe verificação de saúde de graça: erro no console,
 * promise rejeitada sem tratamento e texto vazado (`undefined`, `NaN`,
 * `[object Object]`) reprovam o teste mesmo que a asserção principal passe.
 */

import type { Page } from '@playwright/test';

/**
 * Ruído conhecido, que não indica defeito do produto.
 *
 * Manter a lista curta e comentada: cada entrada é uma verificação desligada.
 */
const IGNORED_CONSOLE = [
  // O RN Web avisa sobre props de estilo que o DOM não conhece; é o preço de
  // rodar o app no browser e não existe no app real.
  /"shadow\*" style props are deprecated/i,
  /props\.pointerEvents is deprecated/i,
  /style\.resizeMode is deprecated/i,
  /style\.tintColor is deprecated/i,
  /Image: style\.resizeMode/i,
  /useNativeDriver.*not supported/i,
  // Ícones e fontes do bundle exportado não são pré-carregados no teste.
  /Failed to load resource/i,
  // Sentry é abortado de propósito pela camada de API.
  /sentry/i,
];

export type ConsoleWatcher = {
  errors: string[];
  /** Erros relevantes, já filtrados pelo ruído conhecido do RN Web. */
  relevant(): string[];
};

/**
 * Encaminha rejeição de promise para o console.
 *
 * O evento `pageerror` do Playwright só cobre exceção não capturada; uma
 * `Promise` rejeitada sem `catch` — o defeito típico de `await` esquecido numa
 * chamada de API — passaria batida. Este script roda antes do app e transforma o
 * evento num `console.error`, que o observador abaixo já reprova.
 */
export function forwardUnhandledRejections(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const { reason } = event;
    const detail = typeof reason === 'string' ? reason : ((reason as Error | undefined)?.message ?? String(reason));
    // eslint-disable-next-line no-console -- o console da página é justamente o canal
    console.error(`unhandledrejection: ${detail}`);
  });
}

export function watchConsole(page: Page): ConsoleWatcher {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  return {
    errors,
    relevant() {
      return errors.filter((text) => !IGNORED_CONSOLE.some((pattern) => pattern.test(text)));
    },
  };
}

/** Textos que denunciam dado não formatado escapando para a interface. */
const LEAKED_TEXT = ['undefined', 'NaN', 'Invalid Date', '[object Object]', 'null'];

/**
 * Procura vazamento de dado bruto no texto visível.
 *
 * Compara palavra inteira para não acusar conteúdo legítimo que contenha o termo
 * (ex.: a palavra "nulls" num nome de tarefa).
 */
export async function findLeakedText(page: Page): Promise<string[]> {
  const visible = await page.evaluate(() => document.body.innerText ?? '');
  return LEAKED_TEXT.filter((needle) => new RegExp(`(^|[\\s>(:])${needle.replace(/[[\]]/g, '\\$&')}([\\s<).,]|$)`).test(visible));
}
