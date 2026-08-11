/** `webServer` do Playwright: serve o bundle de `expo export` em porta fixa. */

import { startStaticServer } from './server.mjs';

const port = Number(process.env.E2E_WEB_PORT ?? 4173);
// `E2E_API_PROXY` só é usado na exploração manual; nos specs o `page.route` responde.
const apiProxy = process.env.E2E_API_PROXY?.replace(/\/+$/, '') ?? null;

const { url } = await startStaticServer({ root: process.env.E2E_WEB_ROOT ?? 'dist-e2e', port, apiProxy });

console.log(`bundle web servido em ${url}${apiProxy ? ` (API em ${apiProxy})` : ''}`);
