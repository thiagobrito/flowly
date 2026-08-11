/**
 * Ambiente para exploração manual (ou por agente) do app num navegador.
 *
 * Os specs não precisam disto: o `page.route` do Playwright responde a API e a
 * fixture injeta a sessão. Quem dirige o navegador por fora — o agente
 * explorador, ou você mesmo — não tem nem um nem outro, então este script sobe o
 * conjunto inteiro: API real com Mongo efêmero, bundle servido na mesma origem
 * (sem CORS) e uma conta recém-registrada, com o `localStorage` pronto para colar.
 *
 * `node e2e/support/explore.mjs` — Ctrl-C derruba tudo.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { startStaticServer } from './server.mjs';
import { buildLocalState } from './state.ts';

const WEB_ROOT = resolve(process.cwd(), '..', 'web');
const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
const API_URL = `http://127.0.0.1:${API_PORT}/api/v1`;
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173);
const BUNDLE = process.env.E2E_WEB_ROOT ?? 'dist-e2e';
const BOOT_TIMEOUT_MS = 180_000;

/** Sobe `mongodb-memory-server` + `next start` do repo da API. */
function startApi() {
  if (!existsSync(resolve(WEB_ROOT, 'package.json'))) {
    throw new Error(`Repo da API não encontrado em ${WEB_ROOT}. Sem ele não há o que explorar além de login e cadastro.`);
  }

  console.log(`subindo a API efêmera na ${API_PORT} (build do Next precisa existir: npm run build em ${WEB_ROOT})`);

  return spawn('node', ['e2e/support/start-server.mjs'], {
    cwd: WEB_ROOT,
    env: { ...process.env, E2E_PORT: String(API_PORT) },
    stdio: 'inherit',
  });
}

async function waitForApi(child) {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('A API saiu antes de responder. Veja a saída acima.');

    try {
      // `feature-flags` é público: responde 200 sem token e não toca no banco.
      const response = await fetch(`${API_URL}/feature-flags`);
      if (response.ok) return;
    } catch {
      // Ainda subindo.
    }

    await new Promise((wait) => setTimeout(wait, 500));
  }

  throw new Error(`A API não respondeu em ${BOOT_TIMEOUT_MS / 1000}s.`);
}

/** Conta nova a cada execução: a exploração começa sempre do mesmo ponto. */
async function registerAccount() {
  const email = `explore-${Date.now()}@flowly.app`;
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'explore-senha-forte-123', name: 'Explorador' }),
  });

  if (!response.ok) throw new Error(`Registro falhou: ${response.status}`);

  const { token } = await response.json();
  return { email, token };
}

const api = startApi();
const stop = () => {
  api.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await waitForApi(api);
const { email, token } = await registerAccount();
const { url } = await startStaticServer({ root: BUNDLE, port: WEB_PORT, apiProxy: API_URL });

const session = buildLocalState({ token, email });
const bootstrap = `localStorage.clear();${Object.entries(session)
  .map(([key, value]) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`)
  .join('')}location.reload();`

console.log(`
app em ${url}   (API em ${API_URL}, conta ${email})

Abra ${url}/, rode isto no navegador e o app volta autenticado:

${bootstrap}
`);
