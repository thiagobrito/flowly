# Google Calendar library

Sincroniza eventos do Google Calendar para o Flowly (pull): conecta a conta
Google via OAuth (`expo-auth-session`), lê os eventos da Calendar API e cria uma
tarefa do Flowly para cada evento agendado (via `PUT /tasks`).

Ponto único de uso — telas/serviços não importam `expo-auth-session` nem chamam
a Google API diretamente.

> Escopo somente leitura (`calendar.readonly`). Nunca cria/edita eventos no
> Google. Requer dev/standalone build (o redirect nativo de OAuth não funciona
> no Expo Go).

## Configuração

Defina os Client IDs do OAuth no `.env` (veja a seção "Integração com Google
Calendar" no README do projeto para criá-los no Google Cloud Console):

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

## Uso na UI (hook)

```tsx
import { useGoogleCalendarSync } from '@/lib/googleCalendar';

function Integration() {
  const { isConnected, pending, lastSyncAt, connect, syncNow, disconnect } = useGoogleCalendarSync({
    onSynced: (result) => console.log(result.created, 'tarefas criadas'),
  });

  // connect()    -> abre o OAuth e, ao concluir, importa os eventos automaticamente
  // syncNow()    -> reexecuta a importação (conta já conectada)
  // disconnect() -> limpa os tokens (logout)
}
```

## Uso programático

```ts
import { getGoogleAccessToken, syncEventsToTasks } from '@/lib/googleCalendar';

const token = getGoogleAccessToken();
if (token) {
  const result = await syncEventsToTasks({ token });
  console.log(result.created, result.skipped, result.failed);
}
```

## Como funciona

1. `useGoogleAuth` faz o OAuth (`expo-auth-session/providers/google`) e persiste
   os tokens com a lib de `storage` (chave `google_calendar_tokens_v1`).
2. `listUpcomingEvents` busca os eventos do calendário primário (janela padrão:
   agora -> +30 dias), expandindo recorrências (`singleEvents=true`).
3. `eventToTaskPayload` mapeia cada evento com horário para uma tarefa `once`
   (data + hora locais, duração = fim - início, área `other`).
4. `syncEventsToTasks` cria as tarefas via `PUT /tasks`, deduplicando pelo mapa
   `eventId -> taskId` persistido (chave `google_calendar_sync_map_v1`). Eventos
   de dia inteiro e os já importados são ignorados.

## Exports principais

- `useGoogleCalendarSync` — hook de conexão + importação (para a UI)
- `useGoogleAuth` / `getGoogleAccessToken` — OAuth e leitura síncrona do token
- `syncEventsToTasks` — importa eventos como tarefas
- `listUpcomingEvents` / `defaultEventWindow` — leitura crua de eventos
- `eventToTaskPayload` — mapeamento evento -> payload de tarefa
- `getGoogleClientIds` / `hasGoogleClientIds` — config do OAuth
- Tipos: `GoogleCalendarEvent`, `GoogleTokens`, `SyncMap`, `SyncResult`, etc.
