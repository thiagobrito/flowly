# Notifications library

Centraliza o sistema de notificações do app sobre
[`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/):
agendamento de notificações locais por horário, recepção de push remoto (Expo
Push Token), permissões, canal Android e handler de foreground.

Ponto único de uso — telas/serviços **não** importam `expo-notifications` direto.

## Setup (uma vez, no boot)

Feito em [`app/_layout.tsx`](../../../app/_layout.tsx):

```ts
import { configureNotifications, setupNotificationHandler } from '@/lib/notifications';

setupNotificationHandler(); // exibe notificações com o app aberto
configureNotifications({
  // telemetry: { addBreadcrumb, reportError }, // opcional (default: no-op)
  // androidChannel: { name: 'Lembretes' },      // opcional
  // foregroundBehavior: { shouldPlaySound: false },
});
```

O `projectId` do EAS (para o Expo Push Token) é lido automaticamente de
`app.json` (`extra.eas.projectId`); sobrescreva via `configureNotifications({ projectId })`.

## Agendar notificações locais

```ts
import { notifications } from '@/lib/notifications';

// Em uma data/hora específica (uma vez)
const id = await notifications.scheduleAt(
  { title: 'Hora de meditar', body: '5 minutos de respiração', data: { route: '/meditar' } },
  new Date(Date.now() + 60_000),
);

// Todos os dias às 08:00
await notifications.scheduleDaily({ title: 'Bom dia!', body: 'Planeje seu dia' }, 8, 0);

// Gatilho genérico
await notifications.schedule({ title: 'Pausa' }, { type: 'timeInterval', seconds: 3600, repeats: true });

// Gerenciar
const scheduled = await notifications.getScheduled();
await notifications.cancel(id);
await notifications.cancelAll();
```

### Gatilhos suportados (`NotificationTrigger`)

| Tipo           | Campos                          | Comportamento                          |
| -------------- | ------------------------------- | -------------------------------------- |
| `date`         | `date: Date \| number`          | Dispara uma vez na data/hora.          |
| `daily`        | `hour`, `minute`                | Recorrente, todo dia no horário.       |
| `timeInterval` | `seconds`, `repeats?`           | Após N segundos (repetível).           |

> No iOS, `timeInterval` com `repeats: true` exige `seconds >= 60`.

## Push remoto (Expo Push Token)

```ts
import { registerForPushNotificationsAsync } from '@/lib/notifications';

const result = await registerForPushNotificationsAsync();
switch (result.status) {
  case 'granted':
    console.log('Expo Push Token:', result.token); // envie ao backend
    break;
  case 'denied':      // usuário negou a permissão
  case 'unsupported': // emulador/simulador
  case 'error':       // falha (ex.: offline) — result.error tem o detalhe
    break;
}
```

`registerForPushNotificationsAsync` valida dispositivo físico, garante canal +
permissão e obtém o token. **Nunca lança** — sempre retorna um `PushRegistration`.

> Push remoto exige um **dev/standalone build** (não funciona no Expo Go).
> Após alterar `app.json` (plugin/permissões), rode um novo `prebuild`/build.

## Receber e responder

### Hook React (recomendado)

```tsx
import { useNotifications } from '@/lib/notifications';

function Root() {
  const { expoPushToken, registerForPush } = useNotifications({
    registerForPush: true, // registra o token ao montar
    onReceived: (notification) => {
      // chegou com o app aberto
    },
    onResponse: (response) => {
      const { data } = response.notification.request.content;
      // rotear via data (deep link)
    },
  });

  return null;
}
```

### Fora do React

```ts
import { addNotificationResponseListener, getLastNotificationResponse } from '@/lib/notifications';

const sub = addNotificationResponseListener((response) => { /* ... */ });
// ...
sub.remove();

// Cold start (app aberto a partir de um toque):
const last = getLastNotificationResponse();
```

## Permissões

```ts
import { ensurePermissions, getPermissionStatus, requestPermissions } from '@/lib/notifications';

const status = await getPermissionStatus();  // 'granted' | 'denied' | 'undetermined'
await requestPermissions();                  // dispara o prompt do sistema
await ensurePermissions();                   // lê e só pede se ainda 'undetermined'
```

## Configuração nativa

Em [`app.json`](../../../app.json):

- Plugin `expo-notifications` (define ícone/cor das notificações).
- Permissão `android.permission.POST_NOTIFICATIONS` (Android 13+).

## Exports principais

- `notifications` — facade (scheduler/push/listeners)
- `configureNotifications` / `setupNotificationHandler` — setup no boot
- `useNotifications` — hook de listeners + push token
- `registerForPushNotificationsAsync` — obtém o Expo Push Token
- Scheduler: `scheduleNotification`, `scheduleAt`, `scheduleDaily`, `cancelNotification`, `cancelAllNotifications`, `getScheduledNotifications`
- Listeners: `addNotificationReceivedListener`, `addNotificationResponseListener`, `getLastNotificationResponse`
- Permissões: `getPermissionStatus`, `requestPermissions`, `ensurePermissions`
- Tipos: `NotificationContent`, `NotificationTrigger`, `PushRegistration`, `NotificationsConfig`, etc.
