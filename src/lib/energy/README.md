# Energy Score library (inspirado em SAFTE)

Calcula um score de energia (0–100) a partir de dados de saúde coletados do Apple Health (iOS) ou Health Connect (Android).

Importável via `@/lib/energy`.

O módulo expõe dois motores complementares:

- `**computeEnergyScore**` — modelo legado de média ponderada por sinal (retorno preservado: `{ score, band, breakdown, computedAt }`).
- **Flowly Energy Engine** (`computeFlowlyEnergy` / `computeEnergyAtMoment`) — modelo biológico inspirado em RISE Sleep, pesquisa de ritmo circadiano, dívida de sono e modelagem de fadiga estilo SAFTE. Veja a seção [Flowly Energy Engine](#flowly-energy-engine) abaixo.

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
  range: lastDaysRange(14),  // janela de coleta (padrão: 14 dias)
  config: defaultConfig,     // pesos e faixas de normalização
});
```

**Retorno:** `{ score, energy, metrics, loading, error, hasPermissions, requestPermissions, refresh }`


| Campo                | Descrição                                              |
| -------------------- | ------------------------------------------------------ |
| `score`              | Score final 0–100, ou `null` antes da primeira coleta  |
| `energy`             | Resultado completo (`band`, `breakdown`, `computedAt`) |
| `metrics`            | Métricas normalizadas coletadas do Health              |
| `requestPermissions` | Solicita permissões de leitura                         |
| `refresh`            | Re-coleta dados e recalcula o score                    |


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

const metrics = await provider.collect(lastDaysRange(14));
const result = computeEnergyScore(metrics);

console.log(result.score);      // 0-100
console.log(result.band);       // 'low' | 'moderate' | 'high'
console.log(result.breakdown);  // SubScore[] com valor, peso e tier
```

## Métricas coletadas


| Sinal                    | Peso padrão |
| ------------------------ | ----------- |
| Horas de sono            | Muito alto  |
| Horário que acordou      | Alto        |
| Horário atual            | Alto        |
| Treino realizado hoje    | Médio       |
| HRV                      | Alto        |
| FC em repouso            | Médio       |
| Sono profundo            | Médio       |
| Sono REM                 | Médio       |
| Variabilidade do sono    | Médio       |
| Carga de treino (7 dias) | Médio       |


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
  bedTime: '2026-06-07T22:30:00.000Z',
  sleepHistory: [{ date: '2026-06-08', sleepHours: 8 }],
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

## Flowly Energy Engine

Motor de previsão de energia biológica. A pergunta que ele responde não é "quão cansado o usuário está?", e sim:

> **"Qual a capacidade biológica do usuário de realizar trabalho significativo agora?"**

### Arquitetura

```
FlowlyEngineInput ──┬─> Sleep Debt   (janela móvel de 14 dias)
                    ├─> Recovery     (sono + dívida + HRV + FC repouso)
                    ├─> Circadian    (curva contínua em "horas acordado")
                    └─> Sleep Inertia (90 min pós-despertar)
                              │
                              ▼
        energy(t) = clamp( circadian(t) × recovery/100 − inércia(t) )
```

Cada componente é um módulo puro e testado isoladamente:


| Módulo                    | Responsabilidade                                           |
| ------------------------- | ---------------------------------------------------------- |
| `engine/sleepDebt.ts`     | Dívida de sono + score normalizado                         |
| `engine/circadian.ts`     | Curva circadiana + inércia do sono                         |
| `engine/recovery.ts`      | Recovery score + normalizações de HRV/FC                   |
| `engine/compatibility.ts` | Compatibilidade tarefa × energia                           |
| `engine/flowlyEngine.ts`  | Orquestração, score por momento e curva do dia             |
| `engine/flowlyConfig.ts`  | Todos os parâmetros do modelo (tuning sem tocar no código) |


### Matemática do modelo

**1. Sleep Need** — necessidade pessoal de sono (`sleepNeedHours`, padrão 8h). Pode ser personalizada por usuário via input ou config (base para adaptação futura por histórico).

**2. Sleep Debt** — déficits diários acumulados numa janela móvel de 14 dias:

```
dailyDeficit = max(0, sleepNeed − actualSleepHours)
sleepDebt    = Σ dailyDeficit (últimas 14 noites)
```

Noites de superávit não apagam déficits anteriores (consistente com a pesquisa: recuperação é lenta). O score é um mapa linear contínuo pelos pontos da especificação (0h→100, 5h→75, 10h→50, 15h→25, 20h→0):

```
sleepDebtScore = clamp(100 × (1 − debt / 20))
```

**3. Circadian Rhythm** — a curva vive no espaço de "horas acordado" (t), ancorando o ritmo à rotina real do usuário (wakeTime/bedTime) e não ao relógio de parede. É uma soma de funções analíticas, portanto contínua (C¹), sem degraus:

```
C(t) = 58                                   (baseline)
     + 32·G(t; 3,   1.5)                    pico matinal     (2–4h)
     − 20·G(t; 7,   1.3)                    queda da tarde   (6–8h)
     + 22·G(t; 9.5, 1.6)                    segundo pico     (8–11h)
     − 42·smoothstep((t−12)/(dia−12))       declínio noturno (12h+)
```

onde `G(t; c, w) = exp(−(t−c)²/2w²)` é uma gaussiana e `dia` é o intervalo acordado→dormir (derivado de `wakeTime`/`bedTime`, fallback `24 − sleepNeed`). Após o horário de dormir há decaimento linear extra de 6 pts/h. Resultado clampado em 0–100.

**4. Sleep Inertia** — meia-cosseno suave nos primeiros 90 minutos:

```
penalty(t) = 30 × 0.5 × (1 + cos(π·t/1.5))   para t ∈ [0, 1.5h)
```

Penalidade máxima (30 pts) ao acordar, metade aos 45 min, exatamente 0 aos 90 min, com derivada nula nas bordas (sem cortes bruscos).

**5. Recovery Score** — prontidão fisiológica, média ponderada com re-normalização automática quando sinais faltam:

```
recovery = 0.40·sleepQuality + 0.30·sleepDebtScore + 0.20·hrvScore + 0.10·rhrScore
```

- `sleepQuality`: linear até a necessidade (6h/8h → 75); dormir além penaliza 5 pts/h.
- `hrvScore`: escala **logarítmica** (HRV é log-normal na população): 20 ms → 0, 100 ms → 100.
- `rhrScore`: linear invertido: 45 bpm → 100, 85 bpm → 0.
- Sem nenhum sinal → score neutro 50.

**6. Final Energy Score**

```
energy(t) = clamp( C(t) × recovery/100 − inertiaPenalty(t), 0, 100 )
```

O recovery age como teto multiplicativo do dia (usuário mal recuperado nunca atinge o topo da própria curva circadiana); a inércia é subtrativa e só atua nos primeiros 90 min.

**Task Compatibility**

```
compatibility = 1 − |currentEnergy − taskEnergy| / 5      (escalas 0–5 → resultado 0–1)
```

Use `energyScoreToLevel(score)` para converter 0–100 → 0–5.

### Uso

```ts
import {
  computeEnergyAtMoment,
  computeFlowlyEnergy,
  computeTaskCompatibility,
  energyScoreToLevel,
  flowlyInputFromMetrics,
  generateEnergyCurve,
  getHealthProvider,
} from '@/lib/energy';

const metrics = await getHealthProvider().collect();
const input = flowlyInputFromMetrics(metrics, 8); // sleepNeed opcional

// Energia agora
const now = computeFlowlyEnergy(input);

// Energia em um momento arbitrário do dia
const at15h = computeEnergyAtMoment(input, '2026-06-08T15:00:00.000Z');

// Curva do dia (acordar -> dormir), p/ gráfico e janelas de foco
const curve = generateEnergyCurve(input, undefined, { stepMinutes: 30 });

// Compatibilidade com uma task (energia requerida 0-5)
const c = computeTaskCompatibility(energyScoreToLevel(now.energyScore), task.energy);
```

### Exemplo de entrada e saída

```ts
const input = {
  sleepNeedHours: 8,
  sleepHistory: [
    { date: '2026-06-01', sleepHours: 8 },
    { date: '2026-06-02', sleepHours: 6 },   // +2h de dívida
    { date: '2026-06-03', sleepHours: 7 },   // +1h de dívida
  ],
  lastNightSleepHours: 7,
  wakeTime: '2026-06-08T07:00:00.000Z',
  bedTime: '2026-06-07T23:00:00.000Z',
  hrvMs: 80,
  restingHeartRate: 50,
};

computeEnergyAtMoment(input, '2026-06-08T10:00:00.000Z');
// => {
//   energyScore: 78,          // pico matinal (3h acordado)
//   energyLevel: 3.9,         // escala 0-5
//   band: 'high',
//   components: {
//     sleepNeedHours: 8,
//     sleepDebtHours: 3,
//     sleepDebtScore: 85,
//     circadianEnergy: 90,
//     sleepInertiaPenalty: 0,
//     recoveryScore: 86,
//     hoursAwake: 3,
//   },
//   computedAt: '2026-06-08T10:00:00.000Z',
// }
```

Usuário privado de sono (7 noites de 5h, HRV 25 ms, FC repouso 80 bpm) no mesmo horário: `energyScore ≈ 26`, `band: 'low'` — a tarde dele inteira fica abaixo de 30, então o priorizador direciona tarefas leves.

### Sugestões de evolução com machine learning

1. **Sleep need adaptativo** — estimar a necessidade real de sono por usuário via regressão sobre o histórico (noites sem despertador, fim de semana vs. semana), em vez do padrão 8h.
2. **Cronotipo individual** — ajustar os centros das gaussianas (pico matinal, dip, segundo pico) por usuário a partir de padrões de atividade/HRV, classificando cronotipos (matutino/vespertino).
3. **Curva circadiana aprendida** — substituir as gaussianas fixas por um modelo aditivo (GAM) ou rede leve treinada com auto-relatos de energia ("como você está agora?") como rótulo.
4. **Pesos de recovery personalizados** — aprender os pesos 40/30/20/10 por usuário (algumas pessoas são mais sensíveis a HRV, outras a duração de sono) via regressão regularizada.
5. **Baselines pessoais de HRV/FC** — normalizar por z-score da janela móvel de 30-60 dias do próprio usuário em vez de faixas populacionais (20-100 ms / 45-85 bpm).
6. **Previsão de dívida futura** — modelo sequencial (ARIMA/LSTM) para projetar a curva de amanhã e sugerir horário ideal de dormir.
7. **Feedback loop com tasks** — usar conclusão/adiamento de tasks de alta energia como sinal fraco de rótulo para calibrar o score continuamente.

## Estrutura do módulo

```
src/lib/energy/
├── README.md
├── index.ts              # API pública
├── types.ts              # HealthMetrics, EnergyScore, FlowlyEngineInput, ...
├── config.ts             # defaultConfig, WEIGHT_TIERS (modelo legado)
├── collectors/           # Apple Health + Health Connect
├── engine/               # Motores de score
│   ├── energyEngine.ts   # computeEnergyScore (legado, média ponderada)
│   ├── flowlyEngine.ts   # Flowly Energy Engine (RISE/SAFTE-inspired)
│   ├── flowlyConfig.ts   # Parâmetros do modelo Flowly
│   ├── sleepDebt.ts      # Dívida de sono (janela de 14 dias)
│   ├── circadian.ts      # Ritmo circadiano + inércia do sono
│   ├── recovery.ts       # Recovery score (sono/dívida/HRV/FC)
│   └── compatibility.ts  # Compatibilidade tarefa × energia
└── hooks/
    └── useEnergyScore.ts
```

## Exports principais


| Export               | Descrição                             |
| -------------------- | ------------------------------------- |
| `useEnergyScore`     | Hook React (pipeline completo)        |
| `computeEnergyScore` | Engine puro (sem side effects)        |
| `getHealthProvider`  | Provider da plataforma (iOS/Android)  |
| `lastDaysRange`      | Helper de intervalo de datas          |
| `defaultConfig`      | Configuração padrão de pesos e faixas |
| `WEIGHT_TIERS`       | Mapa numérico dos tiers de peso       |


Tipos: `HealthMetrics`, `EnergyScore`, `SubScore`, `EnergyBand`, `DateRange`, `EnergyConfig`.