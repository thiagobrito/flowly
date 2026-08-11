/**
 * Servidor estático para o bundle de `expo export --platform web`.
 *
 * O export gera um único `index.html` (modo SPA), então qualquer rota
 * desconhecida precisa cair nele para o expo-router assumir no cliente.
 *
 * Com `apiProxy`, as chamadas de `/api/v1` são repassadas a um backend real. Nos
 * specs quem responde é o `page.route` do Playwright; o proxy existe para
 * exploração manual (e para o agente explorador), onde não há interceptador — e
 * mantém tudo na mesma origem, sem CORS.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Resolve o arquivo a servir, sem permitir escapar da raiz do bundle. */
function resolveFile(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const candidate = resolve(join(root, normalize(decoded)));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

const API_PREFIX = '/api/v1';

/** Repassa a requisição ao backend real, preservando método, cabeçalhos e corpo. */
async function forwardToApi(apiProxy, request, response) {
  const path = (request.url ?? '/').slice(API_PREFIX.length);
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await collectBody(request);

  try {
    const upstream = await fetch(`${apiProxy}${path}`, {
      method: request.method,
      headers: { ...request.headers, host: new URL(apiProxy).host },
      body,
    });

    response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    // 502 em vez de derrubar o servidor: o app trata erro de rede, e a mensagem
    // aparece no console do navegador em vez de sumir no terminal.
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: `Proxy falhou: ${error.message}` }));
  }
}

function collectBody(request) {
  return new Promise((resolveBody) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolveBody(Buffer.concat(chunks)));
  });
}

/**
 * Sobe o servidor e devolve `{ url, close }`.
 *
 * @param {{ root: string, port?: number, apiProxy?: string }} options `port` 0 escolhe uma porta livre.
 */
export async function startStaticServer({ root, port = 0, apiProxy = null }) {
  const rootPath = resolve(root);
  if (!existsSync(join(rootPath, 'index.html'))) {
    throw new Error(`Bundle web não encontrado em ${rootPath}. Rode "npm run e2e:bundle" antes.`);
  }

  const server = createServer((request, response) => {
    if (apiProxy && (request.url ?? '').startsWith(API_PREFIX)) {
      forwardToApi(apiProxy, request, response);
      return;
    }

    const file = resolveFile(rootPath, request.url ?? '/') ?? join(rootPath, 'index.html');
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    // Bundle imutável entre specs: cache agressivo evita releitura de 7 MB.
    response.writeHead(200, { 'Cache-Control': 'no-cache', 'Content-Type': type });
    createReadStream(file).pipe(response);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, '127.0.0.1', resolveListen);
  });

  const address = server.address();
  const resolvedPort = typeof address === 'object' && address ? address.port : port;

  return {
    url: `http://127.0.0.1:${resolvedPort}`,
    close: () => new Promise((resolveClose) => server.close(() => resolveClose())),
  };
}
