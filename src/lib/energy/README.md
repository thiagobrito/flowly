# Energy Score library (inspirado em SAFTE)

Calcula um score de energia (0–100) a partir de dados de saúde coletados do Apple Health (iOS) ou Health Connect (Android).

Importável via `@/lib/energy`.

## Arquitetura

```
Apple Health / Health Connect
          │
          ▼
   Coletor de Dados      (collectors)
          │
          ▼
    Energy Engine        (engine)
          │
          ▼
     Energy Score        (0-100)
```

## Pré-requisitos

- **Dev build** — não funciona no Expo Go.
- **iOS:** HealthKit habilitado no bundle identifier (Apple Developer).
- **Android:** Health Connect instalado (`minSdk 26+`).
- Permissões configuradas em `app.json` via config plugins (`react-native-health`, `react-native-health-connect`, `expo-build-properties`).

Após alterar plugins nativos:

```bash
npx expo prebuild
npx expo run:ios   # ou run:android
```

## Uso rápido (React)

```tsx
import { useEnergyScore } from '@/lib/energy';

function EnergyCard() {
  const { score, energy, loading, error, refresh } = useEnergyScore();

  if (loading) return <Text>Calculando...</Text>;
  if (error) return <Text>Erro: {error.message}</Text>;

  return (
    <>
      <Text>Energy Score: {score ?? '--'}</Text>
      <Text>Faixa: {energy?.band}</Text>
      <Button title="Atualizar" onPress={refresh} />
    </>
  );
}
```

### Opções do hook

```tsx
import { defaultConfig, lastDaysRange, useEnergyScore } from '@/lib/energy';

useEnergyScore({
  autoFetch: true,           // pede permissão e coleta no mount (padrão)
  range: lastDaysRange(7),   // janela de coleta (padrão: 7 dias)
  config: defaultConfig,     // pesos e faixas de normalização
});
```

**Retorno:** `{ score, energy, metrics, loading, error, hasPermissions, requestPermissions, refresh }`

| Campo | Descrição |
| --- | --- |
| `score` | Score final 0–100, ou `null` antes da primeira coleta |
| `energy` | Resultado completo (`band`, `breakdown`, `computedAt`) |
| `metrics` | Métricas normalizadas coletadas do Health |
| `requestPermissions` | Solicita permissões de leitura |
| `refresh` | Re-coleta dados e recalcula o score |

## Uso manual (sem hook)

```ts
import {
  computeEnergyScore,
  getHealthProvider,
  lastDaysRange,
} from '@/lib/energy';

const provider = getHealthProvider();

const granted = await provider.requestPermissions();
if (!granted) return;

const metrics = await provider.collect(lastDaysRange(7));
const result = computeEnergyScore(metrics);

console.log(result.score);      // 0-100
console.log(result.band);       // 'low' | 'moderate' | 'high'
console.log(result.breakdown);  // SubScore[] com valor, peso e tier
```

## Métricas coletadas

| Sinal | Peso padrão |
| --- | --- |
| Horas de sono | Muito alto |
| Horário que acordou | Alto |
| Horário atual | Alto |
| Treino realizado hoje | Médio |
| HRV | Alto |
| FC em repouso | Médio |
| Sono profundo | Médio |
| Sono REM | Médio |
| Variabilidade do sono | Médio |
| Carga de treino (7 dias) | Médio |

Sinais ausentes são ignorados; os pesos restantes são re-normalizados automaticamente.

## Personalizar configuração

```ts
import { computeEnergyScore, defaultConfig } from '@/lib/energy';

const result = computeEnergyScore(metrics, {
  ...defaultConfig,
  bands: { moderate: 40, high: 70 },
  ranges: { ...defaultConfig.ranges, idealSleepHours: 7.5 },
});
```

Tiers de peso (`WEIGHT_TIERS`): `MUITO_ALTO=5`, `ALTO=4`, `MEDIO=3`, `BAIXO=2`.

## Testes (métricas mockadas)

O engine é puro e testável sem permissões nativas:

```ts
import { computeEnergyScore } from '@/lib/energy';

const metrics = {
  sleepHours: 8,
  wakeTime: '2026-06-08T06:30:00.000Z',
  now: new Date().toISOString(),
  workoutToday: true,
  workoutMinutesToday: 45,
  hrvMs: 80,
  restingHeartRate: 50,
  deepSleepMin: 90,
  remSleepMin: 110,
  sleepVariability: 0.3,
  trainingLoad7d: 300,
};

const { score, breakdown } = computeEnergyScore(metrics);
```

```bash
npx jest src/lib/energy
```

## Estrutura do módulo

```
src/lib/energy/
├── README.md
├── index.ts              # API pública
├── types.ts              # HealthMetrics, EnergyScore, SubScore
├── config.ts             # defaultConfig, WEIGHT_TIERS
├── collectors/           # Apple Health + Health Connect
├── engine/               # SAFTE-inspired scoring
└── hooks/
    └── useEnergyScore.ts
```

## Exports principais

| Export | Descrição |
| --- | --- |
| `useEnergyScore` | Hook React (pipeline completo) |
| `computeEnergyScore` | Engine puro (sem side effects) |
| `getHealthProvider` | Provider da plataforma (iOS/Android) |
| `lastDaysRange` | Helper de intervalo de datas |
| `defaultConfig` | Configuração padrão de pesos e faixas |
| `WEIGHT_TIERS` | Mapa numérico dos tiers de peso |

Tipos: `HealthMetrics`, `EnergyScore`, `SubScore`, `EnergyBand`, `DateRange`, `EnergyConfig`.
