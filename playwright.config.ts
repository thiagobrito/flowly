/**
 * E2E do app rodando sob `react-native-web`.
 *
 * O alvo é o bundle de `expo export --platform web`, servido estático — mais
 * rápido e determinístico que `expo start --web`, e gerado uma única vez para
 * toda a suíte (`npm run e2e:bundle`).
 *
 * Por padrão a API é interceptada por um backend falso em memória
 * (`e2e/support/backend.ts`). Com `E2E_API_URL` definido, as requisições vão para
 * o backend real — é assim que o `build.py` roda antes de publicar.
 */

import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_WEB_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    // Tela de celular: o layout do app decide por largura em vários pontos.
    // Sem `isMobile`/`hasTouch` — o RN Web responde a eventos de mouse, e
    // emular toque só tornaria o clique menos confiável.
    viewport: { width: 430, height: 932 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    video: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/support/serve.mjs',
    url: `${BASE_URL}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'app', testMatch: /specs\/.*\.spec\.ts/ },
    // Contrato contra a API real: só roda com `E2E_API_URL` definido, e é o
    // `build.py` que sobe o backend efêmero antes de publicar.
    { name: 'integration', testMatch: /integration\/.*\.spec\.ts/ },
    // A varredura é um projeto à parte para poder ser rodada (ou pulada)
    // sozinha; os seus testes são independentes e rodam em paralelo como os
    // demais, um por tela de entrada.
    { name: 'sweep', testMatch: /sweep\.spec\.ts/ },
  ],
});
