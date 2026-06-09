# Network library

Cliente HTTP genérico sobre `fetch` nativo. É o **ponto único** por onde todas as
requisições do app ao servidor devem passar: centraliza `baseURL`, headers,
timeout, parsing de resposta, erros tipados e hooks de ciclo de vida.

- Zero dependências novas (compatível com Expo / React Native)
- Type-safe: respostas genéricas `<T>` e erros discrimináveis
- Import via `@/lib/network`

## Sumário

- [Início rápido](#início-rápido)
- [Configuração da baseURL](#configuração-da-baseurl)
- [Métodos](#métodos)
- [Opções de requisição](#opções-de-requisição)
- [Query params](#query-params)
- [Headers](#headers)
- [Timeout e cancelamento](#timeout-e-cancelamento)
- [Tratamento de erros](#tratamento-de-erros)
- [Hooks (auth, logging)](#hooks-auth-logging)
- [Clientes adicionais](#clientes-adicionais)
- [API exportada](#api-exportada)

## Início rápido

```ts
import { api } from '@/lib/network';

// GET tipado
const tasks = await api.get<Task[]>('/tasks');

// POST com corpo JSON (serializado automaticamente)
const created = await api.post<Task>('/tasks', { name: 'Meditar', area: 'spirituality' });

// PUT / PATCH / DELETE
await api.put<Task>(`/tasks/${id}`, payload);
await api.patch<Task>(`/tasks/${id}`, { name: 'Novo nome' });
await api.delete(`/tasks/${id}`);
```

Os métodos `get/post/put/patch/delete` retornam diretamente o corpo já parseado
(`Promise<T>`). Se você precisar do `status`/`headers`, use `api.request()`:

```ts
const res = await api.request<Task[]>('GET', '/tasks');
res.data; // Task[]
res.status; // 200
res.headers; // Record<string, string>
```

## Configuração da baseURL

A instância default `api` resolve a `baseURL` a partir da variável de ambiente
`EXPO_PUBLIC_API_URL` (o prefixo `EXPO_PUBLIC_` faz o Expo embutir o valor no
bundle).

```bash
# .env
EXPO_PUBLIC_API_URL=https://api.flowly.app
```

Para reconfigurar em runtime (ex.: no boot do app, ou ao trocar de ambiente):

```ts
import { configureApi } from '@/lib/network';

configureApi({
  baseURL: 'https://api.flowly.app',
  headers: { Authorization: `Bearer ${token}` },
});
```

`configureApi` faz merge com a configuração atual (inclusive `headers`).
Como `api` é um proxy para a instância mais recente, referências obtidas antes
de `configureApi()` continuam funcionando.

> Paths absolutos (`https://...`) ignoram a `baseURL`, então é possível usar a
> lib mesmo sem `baseURL` configurada.

## Métodos

| Método             | Assinatura                                                          | Retorno            |
| ------------------ | ------------------------------------------------------------------- | ------------------ |
| `api.get<T>`       | `(path, options?)`                                                  | `Promise<T>`       |
| `api.post<T>`      | `(path, body?, options?)`                                           | `Promise<T>`       |
| `api.put<T>`       | `(path, body?, options?)`                                           | `Promise<T>`       |
| `api.patch<T>`     | `(path, body?, options?)`                                           | `Promise<T>`       |
| `api.delete<T>`    | `(path, options?)`                                                  | `Promise<T>`       |
| `api.request<T>`   | `(method, path, options?)`                                          | `Promise<ApiResponse<T>>` |

## Opções de requisição

`RequestOptions`:

| Campo     | Tipo                                       | Descrição                                                            |
| --------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `headers` | `Record<string, string \| undefined>`      | Headers desta requisição (mesclados sobre os defaults).              |
| `params`  | `Record<string, ...>`                      | Query params adicionados à URL.                                      |
| `body`    | `unknown`                                  | Corpo. Objetos viram JSON; `FormData`/`Blob`/`string` vão como estão.|
| `signal`  | `AbortSignal`                              | Cancelamento externo (combinado com o timeout interno).             |
| `timeout` | `number`                                   | Timeout em ms. `0` desabilita. Padrão: 30000.                        |
| `parseAs` | `'json' \| 'text' \| 'blob' \| 'none'`     | Como interpretar a resposta. Padrão: `json`.                         |

## Query params

```ts
await api.get<Task[]>('/tasks', {
  params: { area: 'health', done: false, tags: ['a', 'b'] },
});
// => /tasks?area=health&done=false&tags=a&tags=b
```

Valores `null`/`undefined` são ignorados; arrays geram múltiplas entradas.

## Headers

Headers padrão (`Accept` e `Content-Type: application/json`) são aplicados
automaticamente. Para sobrescrever ou remover:

```ts
await api.get('/export', {
  headers: {
    'X-Trace-Id': 'abc-123',
    'Content-Type': undefined, // remove o default
  },
});
```

Ao enviar `FormData`/`Blob`, o `Content-Type` JSON é removido automaticamente
para o runtime definir o boundary correto.

## Timeout e cancelamento

```ts
// timeout específico
await api.get('/slow', { timeout: 5_000 });

// cancelamento externo
const controller = new AbortController();
const promise = api.get('/tasks', { signal: controller.signal });
controller.abort();
```

## Tratamento de erros

Todos os erros herdam de `NetworkError`:

```ts
import { api, HttpError, TimeoutError, ConnectionError, isNetworkError } from '@/lib/network';

try {
  await api.get<Task[]>('/tasks');
} catch (error) {
  if (error instanceof HttpError) {
    // resposta com status fora de 2xx
    console.log(error.status); // 404, 500, ...
    console.log(error.body);   // corpo de erro já parseado
  } else if (error instanceof TimeoutError) {
    console.log(`excedeu ${error.timeout}ms`);
  } else if (error instanceof ConnectionError) {
    console.log('sem rede / DNS / CORS');
  } else if (isNetworkError(error)) {
    console.log('erro genérico de rede');
  }
}
```

| Erro              | Quando ocorre                                          |
| ----------------- | ------------------------------------------------------ |
| `HttpError`       | Resposta com status fora da faixa 2xx (`status`, `body`, `headers`, `url`). |
| `TimeoutError`    | Requisição excedeu o `timeout`.                        |
| `ConnectionError` | Falha de conectividade (sem rede, DNS, CORS).          |
| `NetworkError`    | Base de todos os anteriores / erro desconhecido.       |

## Hooks (auth, logging)

Hooks permitem evoluir comportamento (injeção de token, logging, métricas) sem
mudar os callers:

```ts
import { configureApi } from '@/lib/network';

configureApi({
  hooks: {
    onRequest: (req) => ({ ...req, headers: { ...req.headers, Authorization: `Bearer ${getToken()}` } }),
    onResponse: (res) => console.log(res.status),
    onError: (err) => reportError(err),
  },
});
```

## Clientes adicionais

Para falar com uma segunda API, crie um client isolado (não afeta o `api` default):

```ts
import { createHttpClient } from '@/lib/network';

const analytics = createHttpClient({
  baseURL: 'https://metrics.exemplo.com',
  timeout: 10_000,
});

await analytics.post('/events', { type: 'task_created' });
```

## API exportada

```ts
import {
  api,             // instância default compartilhada
  configureApi,    // reconfigura a instância default
  createHttpClient,// cria clients isolados
  // erros
  NetworkError,
  HttpError,
  TimeoutError,
  ConnectionError,
  isHttpError,
  isNetworkError,
  // helpers/config
  buildUrl,
  resolveBaseURL,
  DEFAULT_HEADERS,
  DEFAULT_TIMEOUT_MS,
} from '@/lib/network';

import type {
  HttpClient,
  HttpClientConfig,
  RequestOptions,
  ApiResponse,
  HttpMethod,
  QueryParams,
  ClientHooks,
} from '@/lib/network';
```

Veja [`AGENT.md`](./AGENT.md) para convenções de uso por agentes e devs.
