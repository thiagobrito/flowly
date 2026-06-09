# AGENT.md — Network library

Guia objetivo para agentes/devs ao mexer com requisições ao servidor neste app.
Documentação completa em [`README.md`](./README.md).

## Regra de ouro

**Toda** comunicação com o servidor passa por `@/lib/network`. Não use `fetch`,
`XMLHttpRequest` ou bibliotecas HTTP soltas em telas, hooks ou serviços.

```ts
import { api } from '@/lib/network';

const tasks = await api.get<Task[]>('/tasks');
```

## Onde colocar o quê

- **Chamada pontual numa tela/hook**: importe `api` e chame direto.
- **Endpoints reutilizados** (ex.: domínio de Tasks): crie um módulo de serviço
  fora desta lib (ex.: `src/services/tasks.ts`) que use `api` internamente e
  exporte funções tipadas (`getTasks()`, `createTask(payload)`). Esta lib é
  **genérica** — não adicione lógica de domínio aqui.
- **Config global** (`baseURL`, headers, auth, logging): use `configureApi()`
  uma vez no boot do app. Não espalhe configuração pelos callers.
- **Segunda API**: `createHttpClient({ baseURL })`.

## Padrões

- Sempre tipar a resposta: `api.get<MeuTipo>(...)`.
- Corpo de POST/PUT/PATCH é serializado para JSON automaticamente — passe o
  objeto, não `JSON.stringify`.
- Trate erros por tipo (`HttpError`, `TimeoutError`, `ConnectionError`); todos
  herdam de `NetworkError`.
- Use `params` para query string (não concatene na URL manualmente).

```ts
import { api, HttpError } from '@/lib/network';

try {
  return await api.post<Task>('/tasks', payload);
} catch (error) {
  if (error instanceof HttpError && error.status === 422) {
    // erro de validação: error.body tem os detalhes
  }
  throw error;
}
```

## Do / Don't

| Faça                                                | Não faça                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| `api.get<T>('/tasks')`                              | `fetch('https://.../tasks')`                      |
| `api.post('/tasks', payload)`                       | `api.post('/tasks', JSON.stringify(payload))`     |
| `api.get('/t', { params: { area } })`               | `api.get(\`/t?area=${area}\`)`                    |
| `configureApi({ baseURL })` no boot                 | hardcode de `baseURL` em cada chamada             |
| serviços de domínio em `src/services/*`             | lógica de domínio dentro de `src/lib/network`     |

## Estrutura interna (para manutenção)

| Arquivo       | Responsabilidade                                                    |
| ------------- | ------------------------------------------------------------------- |
| `index.ts`    | Doc, instância default `api`, `configureApi`, barrel de exports.    |
| `client.ts`   | `createHttpClient`: fetch, timeout, parsing, erros, hooks.          |
| `config.ts`   | Defaults, `resolveBaseURL`, `buildUrl` (query string).              |
| `errors.ts`   | `NetworkError` e subtipos + type guards.                            |
| `types.ts`    | Contratos públicos.                                                 |

Ao alterar comportamento, mantenha o `README.md` e este arquivo em sincronia, e
rode `npm run check-types` e `npm run lint`.
