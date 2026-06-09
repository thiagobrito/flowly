# Storage library

Estado React persistido sobre um backend key/value (AsyncStorage por padrão).
Centraliza em um único lugar: hidratação, cache em memória **compartilhado por
chave**, escrita serial fora do frame de interação, telemetria opcional e
trimming de payloads grandes.

Sem lógica de domínio aqui — a lib é genérica (o que persistir e como reduzir é
decisão do app).

## Uso rápido

```tsx
import { usePersistedState } from '@/lib/storage';

function Profile() {
  const [profile, setProfile] = usePersistedState({ name: '' }, 'storage_v1');

  if (!profile.loaded) return <Text>Carregando...</Text>;

  return (
    <Button title="Salvar" onPress={() => setProfile({ ...profile, name: 'Ana' })} />
  );
}
```

O hook retorna uma tupla `[state, setPersisted, lastUpdate]`:

- `state` — estado hidratado. Objetos ganham `loaded: true` e `lastUpdate`
  (ISO) automaticamente; arrays são preservados como estão.
- `setPersisted(value, force?, trace?)` — atualiza o cache (síncrono, notifica
  todos os hooks da mesma chave) e agenda a escrita no backend.
- `lastUpdate` — ISO timestamp da última escrita local (ou `null`).

### `initial` define o shape

O `initial` determina o formato esperado. Se o dado persistido tiver um shape
incompatível (ex.: array onde se esperava objeto), ele é descartado e o estado
volta ao fallback derivado do `initial`.

```tsx
const [tasks, setTasks] = usePersistedState<Task[]>([], 'tasks_v1'); // array
const [prefs, setPrefs] = usePersistedState({ theme: 'dark' }, 'prefs_v1'); // objeto
```

## Configuração (uma vez, no boot)

```ts
import { configureStorage } from '@/lib/storage';

configureStorage({
  // telemetry: { addBreadcrumb, reportMessage }, // default: no-op
  // backend: meuBackend,                         // default: AsyncStorage
  maxSizeBytes: 256 * 1024,
  warnSizeBytes: 128 * 1024,
  hydrationTimeoutMs: 5000,
});
```

Campos omitidos preservam o valor atual (merge superficial). Não espalhe
configuração pelos callers — configure uma vez.

### Backend customizado

Qualquer objeto que implemente `StorageBackend` (`getItem`/`setItem`) serve. Útil
para testes em memória, storage seguro ou MMKV:

```ts
import { configureStorage, type StorageBackend } from '@/lib/storage';

const memory = new Map<string, string>();
const memoryBackend: StorageBackend = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, value) => void memory.set(key, value),
};

configureStorage({ backend: memoryBackend });
```

### Telemetria (ex.: Sentry)

A telemetria é opcional e por padrão no-op. Conecte um `StorageTelemetry` para
instrumentar leituras/escritas nativas e timeouts de hidratação:

```ts
import { configureStorage } from '@/lib/storage';
import { addBreadcrumb, reportMessage } from '@/lib/sentry';

configureStorage({ telemetry: { addBreadcrumb, reportMessage } });
```

Eventos emitidos (categoria `native-storage`):
`AsyncStorage.getItem.{start,success,error}` e
`AsyncStorage.setItem.{start,success,error}`. Em timeout de hidratação, também
é chamado `reportMessage('hydration_timeout', ...)`.

## Trimming de payloads grandes

Quando o payload serializado de uma chave excede `maxSizeBytes`, a lib tenta
aplicar um **trimmer** registrado para aquela chave antes de persistir. Se ainda
assim continuar grande, a escrita é abortada (e logada). Entre `warnSizeBytes` e
`maxSizeBytes`, apenas um aviso é emitido.

A lib não conhece o formato dos seus dados, então o trimming é injetado:

```ts
import { registerTrimmer, trimNutritionData, trimProfileData } from '@/lib/storage';

registerTrimmer('nutrition_v2', trimNutritionData);
registerTrimmer('storage_v1', trimProfileData);
```

`trimNutritionData` e `trimProfileData` são trimmers prontos (puros, opt-in).
Você também pode escrever o seu:

```ts
import { registerTrimmer, type Trimmer } from '@/lib/storage';

const trimLogs: Trimmer = (value) =>
  Array.isArray(value) ? value.slice(-100) : value;

registerTrimmer('logs_v1', trimLogs);
```

## Comportamento de concorrência

- **Cache por chave**: vários `usePersistedState` com a mesma chave compartilham
  estado. Um `setPersisted` em um notifica todos os outros imediatamente.
- **Hidratação única**: a leitura do backend acontece uma vez por chave; chamadas
  concorrentes reutilizam a mesma promise. Há timeout (`hydrationTimeoutMs`) —
  em estouro, publica-se um fallback com `hydrationTimedOut: true`.
- **Escrita serial**: as escritas de uma chave são enfileiradas (FIFO) e rodam
  via `InteractionManager.runAfterInteractions`, fora do frame de animação.
- **Eviction**: a entrada de cache é removida quando não há listeners, hidratação,
  escritas pendentes nem persistência agendada.

## Testes

```ts
import {
  configureStorage,
  resetPersistedStateCacheForTests,
  resetStorageConfigForTests,
} from '@/lib/storage';

beforeEach(() => {
  resetPersistedStateCacheForTests();
  resetStorageConfigForTests();
  configureStorage({ backend: memoryBackend });
});
```

## Exports principais

- `usePersistedState` — hook de estado persistido
- `configureStorage` — backend, telemetria e limites
- `registerTrimmer` / `unregisterTrimmer` — trimming por chave
- `trimNutritionData` / `trimProfileData` — trimmers prontos (opt-in)
- `resetPersistedStateCacheForTests` / `resetStorageConfigForTests` — helpers de teste
- Constantes: `DEFAULT_STORAGE_KEY`, `MAX_PERSISTED_STATE_SIZE_BYTES`, `WARNING_SIZE_BYTES`, `HYDRATION_TIMEOUT_MS`
- Tipos: `PersistedValue`, `PersistedRecord`, `StorageBackend`, `StorageTelemetry`, `Trimmer`, `StorageConfig`, `SetPersisted`, `UsePersistedStateResult`

## Estrutura interna (para manutenção)

| Arquivo                | Responsabilidade                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| `index.ts`             | Doc + barrel de exports.                                               |
| `usePersistedState.ts` | O hook: hidratação, `setPersisted`, trimming e agendamento de escrita. |
| `cache.ts`             | Cache por chave, hidratação com timeout, fila de escrita, listeners.   |
| `config.ts`            | Constantes + runtime (`configureStorage`, trimmers, backend/telemetria default). |
| `helpers.ts`           | Puros: `deepClone`, tamanho, caller, normalização de shape.            |
| `trimmers.ts`          | Trimmers prontos (opt-in), sem acoplar a chaves.                       |
| `types.ts`             | Contratos públicos.                                                    |
