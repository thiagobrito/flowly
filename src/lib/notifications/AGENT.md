# AGENT.md — Notifications library

Guia objetivo para agentes/devs ao lidar com notificações neste app.
Documentação completa em [`README.md`](./README.md).

## Regra de ouro

**Todo** acesso a notificações passa por `@/lib/notifications`. Não importe
`expo-notifications` direto em telas, hooks ou serviços.

```ts
import { notifications } from '@/lib/notifications';

await notifications.scheduleDaily({ title: 'Bom dia!' }, 8, 0);
```

## Onde colocar o quê

- **Setup global** (handler de foreground, canal, telemetria, projectId):
  `setupNotificationHandler()` + `configureNotifications()` uma vez no boot
  (`app/_layout.tsx`). Não espalhe configuração pelos callers.
- **Agendar/cancelar notificações locais**: use o facade `notifications` ou as
  funções nomeadas (`scheduleAt`, `scheduleDaily`, `scheduleNotification`,
  `cancel*`, `getScheduledNotifications`).
- **Push remoto**: `registerForPushNotificationsAsync()` retorna o Expo Push
  Token. O envio ao backend é responsabilidade do caller (ex.: via `@/lib/network`).
- **Listeners em componentes**: prefira o hook `useNotifications` (faz cleanup).
  Fora do React, use `addNotification*Listener` e chame `.remove()`.

## Padrões

- `registerForPushNotificationsAsync` **nunca lança**: retorna `{ status, token }`.
  Cheque `status === 'granted'` antes de usar `token`.
- Push remoto exige **dev/standalone build** (não funciona no Expo Go).
- No Android, o canal padrão é garantido automaticamente no registro de push;
  agendamentos já anexam o `channelId` padrão.
- `getLastNotificationResponse()` cobre o cold start (app aberto via toque).

## Do / Don't

| Faça                                                  | Não faça                                          |
| ----------------------------------------------------- | ------------------------------------------------- |
| `notifications.scheduleAt(content, date)`             | `Notifications.scheduleNotificationAsync(...)`    |
| `setupNotificationHandler()` no boot                  | configurar handler dentro de telas                |
| `configureNotifications({ telemetry })` no boot       | importar `sentry` dentro de telas para isso       |
| `useNotifications({ onResponse })`                    | registrar listeners sem `.remove()` no unmount    |
| checar `result.status === 'granted'`                  | assumir que `result.token` sempre existe          |

## Estrutura interna (para manutenção)

| Arquivo                   | Responsabilidade                                                  |
| ------------------------- | ----------------------------------------------------------------- |
| `index.ts`                | Doc + barrel de exports + facade `notifications`.                 |
| `config.ts`               | Defaults, runtime (`configureNotifications`), `resolveProjectId`. |
| `handler.ts`              | Handler de foreground (`setNotificationHandler`).                 |
| `permissions.ts`          | `get`/`request`/`ensure` permissões, normalizando o status.       |
| `channels.ts`             | Canal Android (`ensureAndroidChannel`), no-op fora do Android.    |
| `scheduler.ts`            | Agendar/cancelar/listar notificações locais.                      |
| `push.ts`                 | Fluxo de registro do Expo Push Token.                             |
| `listeners.ts`            | Wrappers dos listeners de recepção/resposta.                      |
| `hooks/useNotifications.ts` | Hook React: listeners + push token.                             |
| `types.ts`                | Contratos públicos.                                               |

Ao alterar comportamento, mantenha o `README.md` e este arquivo em sincronia, e
rode `npm run check-types` e `npm run lint`.
