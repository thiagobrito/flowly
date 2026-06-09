# AGENT.md — Storage library

Guia objetivo para agentes/devs ao lidar com estado persistido neste app.
Documentação completa em [`README.md`](./README.md).

## Regra de ouro

**Todo** estado que precisa sobreviver a reloads/restarts passa por
`@/lib/storage`. Não use `AsyncStorage` (nem outro KV) direto em telas, hooks ou
serviços.

```ts
import { usePersistedState } from '@/lib/storage';

const [profile, setProfile] = usePersistedState({ name: '' }, 'storage_v1');
```

## Onde colocar o quê

- **Estado de UI/persistência numa tela/hook**: use `usePersistedState` direto.
- **Config global** (backend, telemetria, limites): `configureStorage()` uma vez
  no boot. Não espalhe configuração pelos callers.
- **Reduzir payload grande de uma chave**: registre um `Trimmer` com
  `registerTrimmer(key, fn)` (no boot/módulo do domínio). A lib é **genérica** —
  não adicione lógica de domínio aqui; trimmers de domínio são injetados.
- **Backend alternativo** (testes em memória, MMKV, secure storage): passe
  `backend` em `configureStorage`.

## Padrões

- O `initial` define o shape esperado; dados incompatíveis viram fallback.
- Objetos hidratados ganham `loaded`/`lastUpdate` — cheque `state.loaded` antes
  de renderizar dados.
- `setPersisted` aceita só objeto/array (primitivos são ignorados com log).
- Não chame `JSON.stringify`/`parse` no caller — a lib serializa.
- Trimmers devem ser **puros** e retornar uma versão menor do mesmo shape.

## Do / Don't

| Faça                                                | Não faça                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| `usePersistedState(initial, 'key')`                 | `AsyncStorage.getItem('key')`                     |
| `configureStorage({ telemetry })` no boot           | importar `sentry` dentro de telas para storage    |
| `registerTrimmer('nutrition_v2', trimNutritionData)`| hardcodar `if (key === 'nutrition_v2')` na lib    |
| checar `state.loaded`                               | assumir dados prontos no primeiro render          |
| backend em memória nos testes                       | bater no AsyncStorage real em teste               |

## Estrutura interna (para manutenção)

| Arquivo                | Responsabilidade                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| `index.ts`             | Doc + barrel de exports.                                               |
| `usePersistedState.ts` | Hook: hidratação, `setPersisted`, trimming e agendamento de escrita.   |
| `cache.ts`             | Cache por chave, hidratação com timeout, fila de escrita, listeners.   |
| `config.ts`            | Constantes + runtime (`configureStorage`, trimmers, defaults).         |
| `helpers.ts`           | Puros: `deepClone`, tamanho, caller, normalização de shape.            |
| `trimmers.ts`          | Trimmers prontos (opt-in), sem acoplar a chaves.                       |
| `types.ts`             | Contratos públicos.                                                    |

Ao alterar comportamento, mantenha o `README.md` e este arquivo em sincronia, e
rode `npm run check-types` e `npm run lint`.
