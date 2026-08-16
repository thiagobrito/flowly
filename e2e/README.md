# E2E do app

O app é exportado como web (`expo export --platform web`) e testado num Chromium
real. É o mesmo código de produto: `react-native-web` traduz cada
`accessibilityLabel` em `aria-label`, então os seletores são os nomes acessíveis
que já existem — nada de `testID` novo espalhado pelo código.

## Rodando

```bash
npm run e2e         # exporta o bundle e roda tudo
npm run e2e:only    # reaproveita dist-e2e (rápido, para iterar num spec)
npm run e2e:ui      # modo interativo do Playwright
npx playwright test --project=app      # só os specs de tela
npx playwright test --project=sweep    # só a varredura
```

Como o alvo é o bundle, **mudança em `src/` exige reexportar** (`npm run
e2e:bundle`) antes de `e2e:only`.

## Como o ambiente sobe

`e2e/support/serve.mjs` é o `webServer` do Playwright: serve `dist-e2e/` estático
na 4173, com fallback de SPA. O bundle é exportado com `EXPO_PUBLIC_API_URL=/api/v1`,
então as chamadas saem relativas à origem do bundle e o `page.route` as intercepta
sem CORS.

`E2E_ALERT_SHIM=1` no export troca o `Alert` do `react-native-web` (que é um
no-op) pelo shim em `support/alertShim.js`, que desenha um `role="dialog"` de
verdade. Sem ele, todo fluxo de confirmação — deletar tarefa, sair, excluir conta
— seria intestável.

## Dois modos de backend

- **mock** (padrão): `support/backend.ts` é um backend em memória, mutável durante
  o teste. O spec ajusta `app.world` e a próxima requisição já vê a mudança.
- **integração** (`E2E_API_URL=http://127.0.0.1:3100/api/v1`): o Playwright repassa
  as requisições ao backend real. É o modo que o `build.py` usa antes de publicar,
  para pegar divergência entre a fixture e a API.

O contrato que as fixtures espelham é o que a suíte de API do repo `flowly-web`
verifica; quando as duas discordam, é a fixture que está errada.

## Anatomia de um spec

```ts
await app.launch({ scenario: 'premium', now: '2026-01-15T09:00:00' });
await app.tab('goals');
```

`app.launch()` intercepta a API com o mundo do cenário, injeta o `localStorage`
(sessão, onboarding concluído, modo de energia) para pular login, abre a rota e
espera o app ficar pronto. Cenários disponíveis em `support/scenarios.ts`: `fullDay`,
`newAccount`, `expiredTrial`, `premium`, `serverError`, `unauthorized`.

Ajudantes que existem por causa do RN Web:

- `app.tap(locator)` — clique com pausa. Controle dentro de `GestureDetector` não
  reage a clique instantâneo: o reconhecedor de pan fica com o ponteiro.
- `app.swipe(locator, 'left' | 'right')` — arrastar o card de tarefa (esquerda
  deleta, direita edita).
- `app.speak(texto)` — dita no assistente de voz. `support/speech.ts` substitui
  `webkitSpeechRecognition`, que em headless dependeria do serviço do Google.
- `app.confirm(rótulo)` — responde ao `Alert` do shim.

Na desmontagem, a fixture cobra as invariantes globais: erro de console (com
allowlist do ruído do RN Web), promise rejeitada sem `catch` e requisição falhando
fora da allowlist. Um spec que provoca a falha de propósito chama
`app.allowFailures()`.

## A varredura

`sweep.spec.ts` é o crawler: BFS pelos controles acessíveis, cobrando as
invariantes em **todo** estado alcançável — mais texto vazado (`undefined`, `NaN`,
`[object Object]`), error boundary e `axe-core` nas regras que fazem sentido num app
(nome de botão, rótulo de campo, atributo ARIA válido).

Um teste por tela de entrada (home, calendário, andamento, metas, nova atividade,
configurações, paywall, login, cadastro, onboarding), o que dá paralelismo e faz o
nome do teste apontar onde procurar. Cada caminho parte de um app recém-aberto:
relançar custa ~100ms, menos que desfazer o estado anterior.

Duas podas mantêm o tempo previsível: um controle é acionado uma vez **por
profundidade** (podar só pelo nome travaria o onboarding, onde o botão que avança
se chama "Continuar" nos 12 passos) e ações destrutivas ou que saem do app ficam na
lista `BLOCKED` de `support/sweep.ts` — logout e exclusão têm spec dedicado.

Saída em `e2e/.report/sweep/`: um JSON por raiz com estados visitados, controles
exercitados, controles que não abriram nada e os achados, mais um PNG por estado.
Cada raiz também tem um piso de estados visitados: sem ele, uma varredura que
parou de andar entregaria relatório vazio e passaria batida.

## Exploração manual

```bash
npm run e2e:explore
```

Sobe a API real com Mongo em memória, serve o bundle com `/api/v1` repassado na mesma
origem e registra uma conta nova, imprimindo o `localStorage` da sessão para colar no
navegador. É o ambiente para dirigir o app à mão — ou para o agente do skill
`e2e-explorer` (em `.cursor/skills/`), que explora com entradas adversariais e
converte o que achar em spec daqui. Exige o repo da API em `../web`, com `npm run
build` feito.

## Smoke nativo iOS

O Playwright desta pasta exporta para **web**. Lá `Platform.OS !== 'ios'`, então
`new NativeEventEmitter(null)` é no-op — o crash fatal de boot sem o SDK da Meta
(FLOWLY-MOBILE-16) nunca aparece. O smoke nativo fecha esse buraco:

```bash
npm run e2e:ios-smoke          # python build.py smoke
python build.py smoke --skip-prebuild --skip-build   # relança o .app já compilado
```

Ele gera o `ios/` **sem** `META_APP_ID`/`META_CLIENT_TOKEN` (o plugin fica de
fora, como no release que caiu), compila para o iPhone Simulator, lança o app e
falha se o processo morrer ou se o invariant do `NativeEventEmitter` aparecer no
log. Se o [Maestro](https://maestro.mobile.dev) estiver instalado, também afirma
que a tela de login ("Bem-vindo de volta") ficou visível.

Requer macOS + Xcode. Não roda no CI de PR (Ubuntu). Roda no caminho de
publicação (`python build.py all`); `python build.py all --no-ios-smoke` pula
em emergência.

## Onde a suíte roda

No CI de PR, no job `e2e` (modo mock, sem backend). E no caminho de publicação:
`build.py` roda `npm run e2e:ci` e, com `../web` presente, também o projeto
`integration` contra a API efêmera. `python build.py all --no-e2e` pula em emergência.

Os 404 de `GET /onboarding` e `POST /ai/parse-task-field` estão na allowlist
(`KNOWN_MISSING_ENDPOINTS`): o app chama, o backend não tem, e os dois call sites
degradam de propósito — há spec cobrindo cada degradação.
