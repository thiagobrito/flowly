# Flowly — App Analysis & Improvement Report

**Date:** 2026-07-01
**Scope:** User onboarding, functionality verification, and a prioritized roadmap of improvements to maximize the app's chance of success.
**App version:** `2026.06.30` (iOS build 3 / Android versionCode 2026063003)
**Stack:** React Native 0.81 · Expo 54 · Expo Router · TypeScript · NativeWind (Tailwind) · RevenueCat · Sentry

---

## 1. Executive Summary

Flowly is a well-architected productivity app that turns a user's *vision → goals → daily activities*, with a genuinely differentiated **biological energy engine** (SAFTE/RISE-inspired) that reads Apple Health / Health Connect data to schedule tasks around the user's real energy. The engineering foundation is strong: clean, documented library layers (`network`, `storage`, `notifications`, `energy`, `subscription`), a data-driven onboarding, and solid unit tests on the pure logic.

However, the app is **not currently in a shippable-for-success state**. There are a handful of concrete, high-impact defects that undermine the core value proposition and monetization:

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| 1 | ✅ Fixed | `EXPO_PUBLIC_API_URL` in `.env` points at `http://localhost:3000`, but the iOS **production build overrides it** to a live HTTPS API | **Fixed 2026-07-01:** `resolveBaseURL()` (`src/lib/network/config.ts`) now falls back to the production HTTPS URL in any non-dev build when the env value is missing or local — Android/EAS can no longer ship localhost. |
| 2 | ✅ Fixed | Energy is read synchronously (un-`await`ed Promise) on the main Tasks screen | **Fixed 2026-07-01:** `refreshEnergy` now `await`s `collect()`; an `energyReady` flag lets tasks load even at energy level 0 or on collection failure. |
| 3 | 🔴 Critical | Paywall/premium is **not enforced** anywhere (gating is commented out) | No revenue: every "premium" feature is free; the trial/subscription has no teeth. *(Deliberately deferred — needs a free-tier product decision.)* |
| 4 | ✅ Fixed | Onboarding goals/activities are lost **if** the backend call fails (no offline/retry) | **Fixed 2026-07-01:** onboarding progress (step, goals, activities) is persisted to storage and restored on relaunch; `NewGoals` failures now show a retry alert instead of silently discarding work. |
| 5 | ✅ Fixed | `.env` (with API keys) is committed to git | **Fixed 2026-07-01:** `.env` untracked (`git rm --cached`), added to `.gitignore`, and a placeholder `.env.example` committed. Keys ever committed should still be rotated. |
| 6 | 🟠 High | Product ID typo `flowly_montly` | Monthly purchases may fail to resolve against the store. *(Not changed — must match the store SKU, which can't be verified from the repo.)* |

> **Re-check note (2026-07-01):** After verifying the build pipeline, the original "backend unreachable / localhost" finding was **downgraded**. The production API is live and working (§2.1).
>
> **Fix round (2026-07-01):** Items 1, 2, 4 and 5 were fixed in code (see table). Also fixed in the same round: `NewTask` error handling + permanent-spinner hang (§4.1-D), sign-up validation with email/password rules and a Privacy/Terms consent checkbox (§7 P1-5), and stable list keys replacing `Math.random()` (§6). **The one remaining launch blocker is item 3 (paywall enforcement)**, pending a free-tier decision; item 6 needs the store SKU confirmed.

The rest of this report details each area with file references and a prioritized plan.

---

## 2. App Overview

**Entry & routing** (`app/`): Expo Router with a small route set — `index` (Home shell), `login`, `create-account`, `onboarding`. The Home shell (`app/index.tsx`) is a single stateful screen that swaps between tabs (`home`/Tasks, `goals`, `calendar`, `progress`/Statistics, `new`) via a custom `BottomTabBar` rather than a router tab navigator.

**Guard flow** (`app/index.tsx`):
```96:102:app/index.tsx
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
```

**Feature surface:**
- **Tasks** — energy-ranked daily activities, filters, complete/delete, reminders.
- **Goals** — 12-week cycle with a primary goal + secondary goals, RPM (Result/Purpose/Massive-action) framing, metrics.
- **Calendar** — day/3-day calendar (`@howljs/calendar-kit`), unscheduled tray, Google Calendar import.
- **Statistics** — progress rings, concluded tasks, sleep card, energy-of-day chart.
- **Energy engine** — the crown jewel; sleep debt, circadian rhythm, sleep inertia, recovery score.
- **Subscription** — RevenueCat, yearly/monthly with a 7-day trial paywall.
- **Notifications** — task reminders + push registration.

### 2.1 Backend & environment (verified 2026-07-01)

The `.env` value `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1` is only the **local-dev** value. The iOS build automation deliberately overrides it to production:
```90:99:build/config.py
def apply_build_environment() -> None:
    """... Mantém `EXPO_PUBLIC_API_URL` apontando para produção (não usa o localhost do .env local)."""
    _load_env_file(ENV_FILE)
    _load_env_file(ROOT_ENV_LOCAL, prefix="SENTRY_")
    _load_env_file(ROOT_ENV)
    os.environ["EXPO_PUBLIC_API_URL"] = PRODUCTION_API_URL  # https://flowly-web-coral.vercel.app/api/v1
```

**Verified live:** the production API responds correctly.
- `POST https://flowly-web-coral.vercel.app/api/v1/auth/login` → `401 {"error":"Invalid credentials"}` (working JSON auth API over HTTPS).
- There is also a **live marketing website** at the same domain (Next.js on Vercel) — a real asset for the web-to-app funnel (see §10 Step 6).
- Note: `GET /api/v1/onboarding` returns 404, so remote onboarding config isn't implemented server-side yet — harmless because the app falls back to `DEFAULT_ONBOARDING`.

**Remaining risk (the reason item 1 is still 🟠, not resolved):** the override lives only in the **local iOS pipeline** (`python build.py`). It is **not** in `eas.json`, and there is no equivalent for Android (`expo run:android` reads `.env` directly). So an EAS build or an Android release could still bundle `http://localhost:3000` unless the URL is set as an EAS environment variable or moved into `app.config` `extra`. **Recommendation:** make the production URL the source of truth for *all* build paths (EAS env vars or `app.config.ts`), not a Python-only override.

---

## 3. User Onboarding Analysis

### 3.1 Flow

Onboarding is **data-driven**: the sequence is described by `OnboardingStep[]` and can be overridden by the backend (`GET /onboarding`), falling back to `DEFAULT_ONBOARDING` (`src/screens/Onboarding/data.ts`). Default sequence:

1. **Language** (only pt-BR selectable; en-US shown as "coming soon")
2. **Quote** (social-proof stat: goal-setting + weekly reporting → +40% success)
3. **Intro** (what we'll set up together)
4. **Notifications** (permission request)
5. **Quote** (consistency > intensity)
6. **Goals** (opens the full `NewGoals` wizard in a modal)
7. **Activities** (opens `NewTask` in a modal, can add several)
8. **Payment** (opens the `Subscription` paywall)
9. **Completed**

Trigger logic is sound: onboarding only shows for **new sign-ups**. `useOnboarding` defaults to `completed: true`, and `signUp` calls `markNeedsOnboarding()` (`app/create-account.tsx`), so existing users and logins skip it.

### 3.2 What's good ✅

- **Excellent structure & polish.** Consistent `StepShell`, progress header with back nav, light/dark theming, accessible labels, keyboard handling.
- **Motivational framing** (evidence-based quotes) is a strong retention pattern.
- **Progressive value.** It gets the user to actually create a goal and activities before hitting the paywall — good conversion psychology.
- **Remote-configurable.** Steps can be tuned server-side without an app release — great for iterating on activation.
- **Permission priming.** The Notifications step explains *why* before triggering the OS prompt (best practice — avoids permanent denials).

### 3.3 Issues & risks ⚠️

1. **🟠 Data loss on network failure (was 🔴).** In `NewGoals.submit()` and `NewTask.handleCreate()`, if the API call fails the flow "continues locally" — but nothing is persisted locally. The `goalSetup` lives only in `Onboarding` component state and is discarded on completion.
   ```73:92:src/screens/NewGoals/index.tsx
   const submit = useCallback(async () => {
     setSubmitting(true);
     try {
       // ...
       await api.post('/goals/anamnesis', setup);
     } catch {
       // segue o fluxo localmente mesmo sem backend disponível
     } finally {
       setSubmitting(false);
       onComplete?.(setup);
     }
   }, [/* ... */]);
   ```
   **Correction after re-check:** the production API is live (§2.1), so on a healthy connection the goals/activities **do** persist and this is *not* the default path. The residual risk is real but narrower: on a flaky/offline connection the user's onboarding work vanishes **silently** with no error or retry. Add optimistic local persistence + retry/error UI so a transient network blip never discards the first goals.

2. **🟠 "At least 3 goals / 3 activities" is copy-only.** The intro promises ≥3 of each, but both steps have a **Skip** button and the Activities CTA enables after just **one** activity. Either enforce a minimum (with encouragement) or soften the copy so expectations match reality.

3. **🟠 No account-level validation.** Sign-up only checks non-empty email and password==confirm (`src/screens/CreateAccount/index.tsx`). No email-format check, no password strength/length, no ToS/privacy consent checkbox — the latter is typically **required** for App Store / Play review and GDPR/LGPD.

4. **🟡 Language step is a dead end for non-PT users.** Only pt-BR works; en-US is disabled. If the goal is international success, i18n is a prerequisite (see §7).

5. **🟡 Notification denial is silent.** `NotificationsStep` calls `registerForPush()` and advances regardless of grant/deny, with no acknowledgement or fallback path to re-ask later.

6. **🟡 No progress persistence within onboarding.** If the user backgrounds/kills the app mid-flow, they restart from step 0 (the `index` state is in-memory). For a multi-step flow that creates goals, resuming would reduce drop-off.

---

## 4. Functionality Verification

### 4.1 Confirmed defects 🐞

**A. Energy is computed from an un-awaited Promise on the Tasks screen (🔴).**
`HealthDataProvider.collect()` is `async` in every provider, but `Tasks` calls it synchronously and casts to `any`:
```153:160:src/screens/Tasks/index.tsx
  const refreshEnergy = useCallback(() => {
    const metrics = getHealthProvider().collect() as any;
    const input = flowlyInputFromMetrics(metrics, 8);
    const result = computeEnergyAtMoment(input, toLocalISOString());
    setEnergyScore(result.doubleEnergyScore);
    setEnergyLevel(result.doubleEnergyLevel);
    return result;
  }, []);
```
`metrics` here is a `Promise`, so `flowlyInputFromMetrics` reads `undefined` for `sleepHistory`, `sleepHours`, `wakeTime`, etc. → the energy score is a **constant fallback**, not the user's real data. This defeats the app's differentiator on its primary screen. Worse, `fetchTasks` is gated on `if (!energyLevel) return;` — if the fallback resolves to level `0`, **tasks never load**. Note the `Statistics` and `Calendar` screens use the correct async `useEnergyScore` hook, so the fix pattern already exists in the codebase.

**B. Backend URL — corrected (🟠, was 🔴 "unreachable").** The `.env` value is `http://localhost:3000/api/v1`, but this is only local-dev. The iOS production pipeline overrides it to `https://flowly-web-coral.vercel.app/api/v1`, and **that backend is verified live** (`POST /api/v1/auth/login` → `401 {"error":"Invalid credentials"}`). See §2.1. So auth and data endpoints **do** work in an iOS release. The remaining, narrower risk: the override is iOS-`build.py`-only — an **EAS build or Android release (`expo run:android`) can still bundle the localhost/cleartext value**. Make the production HTTPS URL the source of truth for every build path (EAS env vars or `app.config.ts`), not just the Python script.

**C. Premium is never enforced (🔴).** `useSubscription` is imported only by the paywall itself and a dev test hook. In `app/index.tsx` it's commented out:
```58:58:app/index.tsx
  // const { isReady: subscriptionReady, isPremium, refresh: refreshSubscription } = useSubscription();
```
There is no gate anywhere that checks `isPremium`/`isTrialing` before allowing "premium" features (calendar sync, advanced stats, unlimited goals). The onboarding paywall is fully skippable. **Result: zero monetization enforcement.**

**D. `NewTask` has no error handling / can hang (🟠).**
```79:89:src/screens/NewTask/index.tsx
  useEffect(() => {
    const fetchLabels = async () => {
      const goalLabels = await api.get<string[]>(`/goals/labels`);
      setLabels(goalLabels);
    };
    fetchLabels();
  }, []);

  if (labels.length === 0) {
    return <ActivityIndicator />;
  }
```
If `/goals/labels` returns `[]` (or the call is unhandled and rejects), the screen is stuck on a permanent spinner. Similarly `handleCreate` does `await api.put('/tasks', payload)` with **no try/catch** — a network failure throws, `onSuccess` never fires, and the user gets no feedback.

**E. Product ID typo (🟠).** `flowly_montly` (should be `flowly_monthly`) in `src/lib/subscription/config.ts`. Store product identifiers must match **exactly**; if the store SKU is spelled correctly, `getCurrentOffering().availablePackages.find(...)` returns nothing → "Plano indisponível" and no monthly revenue.

### 4.2 What works well ✅

- **Energy engine** is genuinely impressive and **well-tested** (circadian, sleep debt, recovery, SAFTE, normalization all have `*.test.ts`).
- **Network layer** is a clean, typed `fetch` wrapper with timeouts, abort, typed errors, hooks, and friendly pt-BR error mapping.
- **Auth** correctly persists the session, injects the `Authorization` header via a snapshot provider (no `useEffect` ordering bugs), and auto-logs-in after register.
- **Subscription purchase/restore** flow is robust: handles `userCancelled`, unsupported platforms, missing native module, Sentry reporting, and reconciles via a RevenueCat listener.
- **Storage** provides a shared, hydrated `usePersistedState` used consistently across libs.
- **Observability**: Sentry wired at the root with notification breadcrumbs.

---

## 5. Security & Compliance Notes

- **`.env` is tracked in git** (`git ls-files .env` → tracked). `.gitignore` only ignores `.env*.local`. It contains a RevenueCat iOS key and a test key. RevenueCat public SDK keys are low-sensitivity, but committing `.env` is a bad pattern that will eventually leak a real secret. **Action:** untrack `.env`, commit a `.env.example`, and ignore `.env`. (Note: rotate anything sensitive that was ever committed.)
- **Cleartext HTTP** (`http://`) is only in the local-dev `.env`; the iOS production build ships HTTPS (§2.1). **Action:** guarantee no build path can ship the `http://localhost` value (EAS/Android included) so a misconfigured build never triggers ATS/cleartext blocking.
- **`sendDefaultPii: true`** in Sentry (`app/_layout.tsx`) sends IP/user data — confirm this is disclosed in the privacy policy and acceptable under LGPD/GDPR.
- **No ToS/Privacy consent** during sign-up — likely required for store review and health-data handling.
- **Health data** is sensitive; ensure the privacy policy explicitly covers HealthKit/Health Connect usage (Apple requires this and will reject otherwise).

---

## 6. Code Quality & Testing

**Strengths:** consistent architecture, thorough JSDoc (pt-BR), clear separation of concerns, an explicit agent style guide (`agent.md`), pure-logic unit tests.

**Gaps:**
- **No tests on screens or flows** — nothing covers onboarding, auth guards, Tasks, subscription gating, or the energy→tasks wiring (which is exactly where the bugs above live). The `collect()` bug would be caught by a single render test.
- **`any` leakage** in data boundaries (`OrganizeTasks(tasks: any)`, `payload as any` in `NewTask`) hides shape mismatches like the `_id`/`id` normalization.
- **Type-check/lint not runnable as-is** (`tsc: command not found` — dependencies not installed in this environment; ensure CI runs `npm ci && npm run check-types && npm run lint && npm test`).
- **Inconsistent error UX:** some calls Alert on failure (Tasks fetch/delete), others swallow silently (NewGoals), others don't handle at all (NewTask create). Standardize.
- ✅ **`Math.random()` React keys** (`randomId` in `OrganizeTasks`) regenerate every fetch, defeating reconciliation and animations. *(Fixed 2026-07-01: `randomId` is now derived from the stable task `id` + list position in Tasks and Calendar.)*

---

## 7. Prioritized Improvement Roadmap

### P0 — Blockers for a real launch (do first)
1. ✅ **Unify the API URL across all build paths.** *(Fixed 2026-07-01)* `resolveBaseURL()` in `src/lib/network/config.ts` now falls back to the production HTTPS URL in non-dev builds when the env value is missing or points at localhost — no build path can ship the dev URL. (Startup connectivity check still open.)
2. ✅ **Fix energy collection on Tasks.** *(Fixed 2026-07-01)* `refreshEnergy` awaits `collect()`; `energyReady` flag replaces the `if (!energyLevel)` hard gate so tasks load even at level 0 or on collection failure.
3. **Enforce monetization.** Re-enable `useSubscription` in the app shell and gate premium features on `isPremium || isTrialing`. Decide the free-tier boundary and lock the rest. Fix the `flowly_montly` product ID to match the store. *(Deferred — awaits free-tier decision + store SKU confirmation.)*
4. ✅ **Make onboarding durable.** *(Fixed 2026-07-01)* Onboarding progress (step index, goal setup, activities) persists via `usePersistedState` (`onboarding_progress_v1`) and is restored on relaunch; `NewGoals.submit()` failures show a "Tentar novamente / Continuar mesmo assim" alert instead of silently discarding work.

### P1 — Activation, retention, trust (next)
5. ✅ (partial) **Sign-up hardening:** *(Fixed 2026-07-01)* email format + minimum password length (8) with inline errors, and a required Privacy Policy/Terms consent checkbox (links via `src/lib/legal.ts`). "Forgot password" path still open.
6. ✅ **Secret hygiene:** *(Fixed 2026-07-01)* `.env` untracked and ignored; `.env.example` added. Still open: rotate previously committed keys; review `sendDefaultPii`.
7. **Notification UX:** handle denial (explain, allow re-ask, deep-link to settings); confirm scheduled reminders actually fire end-to-end.
8. ✅ **Resumable onboarding:** *(Fixed 2026-07-01, together with item 4)* the current step index is persisted, so backgrounding/killing the app resumes where the user left off.
9. **Align copy with behavior:** either enforce the "3 goals / 3 activities" promise or adjust the messaging.
10. **Standardize network error handling** into one helper (toast/alert + Sentry + retry) and remove silent `catch {}`. *(Partially improved 2026-07-01: `NewTask` create/labels now handle errors and no longer hang on a spinner.)*

### P2 — Scale & differentiation (soon after)
11. **Internationalization (i18n).** The en-US path is a dead end; extract strings and enable English to unlock non-Brazilian markets.
12. **Add flow-level tests** (Detox/RTL) for onboarding, auth guards, subscription gating, and the energy→tasks pipeline; wire `check-types`/`lint`/`test` into CI (a Husky hook exists but coverage is thin).
13. **Empty & error states** across Tasks/Goals/Statistics (first-run "create your first goal", offline banners) instead of bare spinners.
14. **Type the API boundary** (replace `any`/`as any` with schemas; consider `zod` for runtime validation of responses) and use stable IDs for list keys.
15. **Accessibility & analytics:** audit dynamic-type/contrast; add funnel analytics on onboarding steps to measure and optimize activation/conversion.

---

## 8. Bottom Line

Flowly's foundation and its energy-aware concept are strong enough to succeed — the differentiation is real and the code is clean. Success is currently blocked by a small number of high-leverage defects: a **localhost backend**, an **un-awaited energy read on the main screen**, **no enforced monetization**, and an **onboarding that can silently discard the user's first goals**. Resolve the P0 list and Flowly moves from "impressive prototype" to "launchable product"; the P1/P2 items then compound activation, trust, revenue, and reach.

---

## 9. Red-Team Estratégico

> Esta seção responde a quatro perguntas de "advogado do diabo" para estressar o plano. As respostas são fundamentadas no que o código revelou (ver §3–§6), não em achismo.

### 9.1 Quais suposições ocultas meu plano está baseado?

Premissas implícitas embutidas no produto — cada uma é um ponto único de falha se estiver errada:

1. **"O usuário tem e vai conectar dados de saúde."** Todo o diferencial (energy score, ranking de tarefas, curva do dia) pressupõe Apple Health/Health Connect com sono, HRV e FC preenchidos. Sem Apple Watch/wearable, sem tracking de sono → o motor cai no fallback e o app vira "só mais um to-do list". Suposição: *a maioria do meu público usa wearable e concede permissão de saúde.*
2. **"O backend escala e se sustenta."** A API existe e está no ar (verificado — §2.1: auth respondendo em HTTPS na Vercel). A suposição residual não é mais "existe infra", e sim que ela **escala, é segura e tem custo sustentável** sob carga real — e que *todos* os caminhos de build (não só o iOS via `build.py`) apontam para ela.
3. **"As pessoas querem o método (RPM + ciclo de 12 semanas + energia)."** O onboarding força uma metodologia opinativa (visão → metas → RPM → atividades). Suposição: *o usuário topa esse trabalho cognitivo já no primeiro uso* — quando a maioria dos apps de produtividade morre exatamente por fricção inicial.
4. **"Energia biológica muda o comportamento."** Presume-se que mostrar "sua energia está baixa às 15h" faz a pessoa reorganizar o dia. É uma hipótese de eficácia comportamental ainda não validada.
5. **"Vão pagar R$ 197/ano por um organizador de tarefas."** O paywall assume disposição a pagar num mercado onde os concorrentes (Notion, Google Tasks, Apple Reminders) são grátis.
6. **"Mercado é o Brasil / pt-BR."** en-US está desabilitado. Suposição: *dá para atingir escala só no Brasil* — ou i18n virá "depois" (e "depois" raramente chega).
7. **"Trial de 7 dias converte."** Presume que 7 dias bastam para o usuário sentir valor — mas o valor (tendência de energia, progresso do ciclo) só aparece em **semanas** de dados, não em dias.
8. **"O usuário confia em dar dados de saúde + PII para um app novo."** `sendDefaultPii: true` e leitura de HealthKit exigem uma confiança que uma marca desconhecida ainda não tem.

**Risco maior:** as suposições 1 e 4 são o coração da tese. Se energia biológica **não** mudar comportamento de forma perceptível, todo o diferencial evapora e sobra um to-do list pago competindo com produtos gratuitos e maduros.

### 9.2 São 18 meses depois e minha ideia falhou. Me guie pelo que deu errado.

*Post-mortem plausível, encadeado a partir dos achados reais:*

- **Mês 0–2 — Lançamento com fissuras de configuração.** O backend existia e funcionava no iOS (§2.1), mas a build de Android saiu apontando para `localhost` (a override só existia no `build.py`, §4.1-B) → metade da base não conseguia logar. Somado a exceções de rede não tratadas (`NewTask` sem try/catch, §4.1-D), os primeiros reviews já vieram com "não abre / não salva".
- **Mês 2–4 — Ativação despenca.** O onboarding pedia metas + atividades, mas quando o save falhava a gente **descartava tudo silenciosamente** (§3.3-1). Usuário terminava o onboarding e caía num app vazio. D1 retention caiu abaixo de 15%.
- **Mês 4–7 — O diferencial não aparece.** No iPhone sem Apple Watch, o energy score era um número fixo (bug do `collect()` não-`await`ado, §4.1-A). As reviews começaram: *"a energia nunca muda"*. O que era pra ser mágico virou motivo de desconfiança.
- **Mês 6–9 — Receita não materializa.** O gating de premium estava comentado (§4.1-C): todo mundo usava tudo de graça. Quem tentava o plano mensal batia no typo `flowly_montly` e a compra falhava. MRR ficou perto de zero enquanto os custos de infra e RevenueCat corriam.
- **Mês 9–12 — Confiança erodida.** Um post viralizou sobre "app de produtividade que lê seus dados de saúde e manda tudo com PII ligado". Sem política de privacidade robusta nem consentimento explícito (§5), veio pressão de review da Apple e churn de confiança.
- **Mês 12–15 — Teto de mercado.** Só pt-BR (§7-11). Sem alavanca internacional, o CAC no Brasil subiu e o TAM pago provou ser pequeno para o preço cobrado.
- **Mês 15–18 — Fim.** Sem retenção (produto), sem receita (monetização não aplicada), sem confiança (privacidade) e sem mercado (só BR), o runway acabou. **Causa raiz:** tratamos como problemas de engenharia "para depois" coisas que eram, na verdade, a tese do negócio (ativação, prova do diferencial, cobrança e confiança).

**Lição:** a ordem P0 da §7 não é higiene técnica — é sobrevivência. Cada P0 mapeia diretamente para um dos capítulos acima.

### 9.3 Um concorrente com US$ 100 milhões quer me esmagar em 90 dias. Qual é o plano dele?

Se eu fosse o incumbente bem-capitalizado mirando o Flowly:

- **Dias 0–15 — Clonar o diferencial e neutralizá-lo.** Meu app (ou um Notion/Todoist/Sunsama da vida) já tem integração com HealthKit. Lanço "Energy-aware scheduling" como **feature dentro de um produto que a pessoa já usa e já paga** — tiro o único motivo de alguém baixar o Flowly.
- **Dias 15–30 — Comprar distribuição.** US$ 100M compram ASO, Meta/TikTok/YouTube em pt-BR, e patrocínio de todo influenciador de produtividade do Brasil na mesma semana. O Flowly, sem verba de aquisição, some do topo da busca.
- **Dias 30–45 — Preço como arma.** Ofereço o tier "Energia" **de graça** (subsidiado) ou empacoto no plano que a pessoa já assina. Contra "grátis de marca conhecida", os R$ 197/ano do Flowly ficam impagáveis.
- **Dias 45–60 — Confiança e compliance como fosso.** Marketing: "seus dados de saúde protegidos por uma empresa auditada, LGPD/GDPR, SOC 2". Exploro exatamente a fraqueza do Flowly (PII ligada, sem consentimento claro, marca desconhecida).
- **Dias 60–75 — Migração sem atrito.** Importador de metas/tarefas do Flowly em um toque + i18n em 10 idiomas (algo que o Flowly ainda "vai fazer depois"). Abro o mundo enquanto o Flowly fica preso no BR.
- **Dias 75–90 — Prova social + lock-in.** Casos, prêmios de "app do ano", integração com Google/Apple Calendar nativa e widgets. Fecho o ciclo: quem experimentou o Flowly já migrou.

**Onde ele me mata:** distribuição, preço (grátis) e confiança de marca. **Onde ele é lento e eu posso vencer:** foco extremo num nicho (ex.: atletas/biohackers que já vivem de wearable), profundidade do motor de energia, velocidade de iteração e uma comunidade apaixonada. A defesa não é competir em amplitude — é ser **inatingivelmente melhor para um público específico** antes de ele reagir.

### 9.4 A resenha de 1 estrela do cliente que se sentiu enganado

> ⭐☆☆☆☆ — **"Prometeram inteligência, entregaram um bloco de notas caro"**
>
> Baixei por causa da promessa de "organizar o dia pela sua energia". Instalei, passei 15 minutos criando minhas metas e umas atividades no tal onboarding bonitinho... e quando terminei, **estava tudo vazio**. Perdi tudo que preenchi. Comecei de novo, mesma coisa.
>
> O tal "Energy Score" então: marca o mesmo número o dia inteiro, todo dia. Boa energia às 3 da manhã, mesma energia depois de uma noite mal dormida. Ou seja, ou não lê meus dados de verdade, ou é enfeite. Se o diferencial do app é esse, o diferencial não funciona.
>
> Aí veio o "7 dias grátis, depois R$ 197". Aceitei porque a ideia é boa no papel. Só que metade das telas dava erro de conexão, tentei assinar o plano mensal e **a compra nem completou**. Paguei o anual, e continuei tendo os mesmos bugs — nenhuma "função premium" que justificasse.
>
> E o pior: só depois percebi que ele fica lendo meus dados de saúde. Não vi política de privacidade clara, não lembro de ter autorizado direito. Dei acesso a sono e batimentos para um app que nem consegue salvar minha lista de tarefas.
>
> Resumo: **cobra como produto premium, funciona como protótipo.** Me senti enganado. Pedi reembolso. Se um dia consertarem o básico — salvar meus dados, fazer a energia funcionar de verdade e parar de dar erro — talvez eu volte. Hoje, não recomendo.
>
> *Útil? 👍 214*

*Cada frase dessa review mapeia para um defeito concreto do §4 (perda de dados no onboarding, energy score estático, erros de rede, compra mensal quebrada, premium não entregue, privacidade). É a materialização, na voz do cliente, dos riscos P0.*

---

## 10. Playbook to Win — Aligned with RevenueCat *State of Subscription Apps 2026*

This section translates the industry benchmarks from RevenueCat's SOSA 2026 report into the concrete steps Flowly must follow to have a real shot at becoming a **top-decile** app. The market context is brutal and sets the bar:

- **It's a sorting machine.** Median app grew MRR just **5.3% YoY**; the top decile grew **306%+**; the bottom decile shrank >60%. Slight growth = losing.
- **Supply shock.** ~15,000 new subscription apps launch **per month** (7× since 2022). **Distribution, not features, is the primary barrier.** Apps launched before 2020 still earn **69%** of all subscription revenue; 2025+ apps earn just 3%.
- **Patience required.** Even top categories take **>100 days** to reach $10k MRR.

The good news: Flowly sits in the **best-monetizing category**. Health & Fitness leads early monetization at **$0.48 RPI at D14** (~6× Gaming) and **$0.66 at D60**, and skews to **annual plans (68%)** — a retention-focused profile. Flowly's health-data energy engine lets it credibly position as Health & Fitness rather than crowded "productivity."

### The steps, in funnel order

#### Step 0 — Fix the P0 defects first (non-negotiable prerequisite)
The report's core finding is that **Day 0 decides everything** (see Step 2). None of the tactics below matter if the app shows a frozen energy score, can't process a purchase, or loses onboarding data on a network blip. **Ship §7's P0 list before spending a cent on growth.** Marketing a broken funnel just pays to accelerate churn.

> **Post re-check scope:** the backend is live (§2.1), so the true remaining P0s are (a) the energy `collect()` bug, (b) enforced monetization/gating, and (c) durable onboarding + a single source of truth for the API URL across all build paths (iOS/Android/EAS).

#### Step 1 — Choose the monetization model deliberately: lean toward a hard paywall
- **Benchmark:** Hard paywalls convert **5× better** than freemium (**10.7% vs 2.1%** D35 download-to-paid) and generate **~8–9× higher RPI** ($2.32 vs $0.27 median D14), with **nearly identical Year-1 retention**.
- **For Flowly:** Today it has *neither* — premium gating is commented out (§4.1-C), so it's accidental freemium with no enforcement. Pick a model on purpose. Given H&F economics and no strong network-effect/virality loop, **a hard paywall (or trial-gated hard paywall) after the aha moment is the higher-EV choice.** Keep freemium only if you deliberately build a word-of-mouth/referral loop.
- **Action:** Re-enable `useSubscription` in the app shell, gate the core loop, and require trial start to proceed past onboarding value delivery.

#### Step 2 — Win Day 0: deliver the "aha!" in the first session
- **Benchmark:** **55% of 3-day trial cancellations happen on Day 0.** "Users who don't see value immediately rarely come back to find it."
- **Flowly's structural risk:** its value (energy *trends*, cycle progress) only emerges over **weeks**, and the differentiator is dead on iPhones without a wearable (§4.1-A). This is the single biggest strategic threat.
- **Action:**
  1. Fix the energy `collect()` bug so the score is real on Day 0.
  2. Engineer an **instant aha without a wearable**: ask 2–3 quick questions (typical bedtime/wake, last night's sleep) and render a *personalized energy curve for today* immediately — "your peak focus window is 9–11am; schedule your hardest task there." That is a felt, first-session payoff.
  3. Make onboarding **durable** (never discard the goals/activities the user just created) so the first session ends with a populated, working app.

#### Step 3 — Rethink trial length (7 days is likely too short here)
- **Benchmark:** Trials of **17+ days convert 70% better** than short trials (**42.5% vs 25.5%**), yet the industry is (wrongly) shortening to ≤4 days.
- **For Flowly:** The energy/cycle value compounds over time — a 7-day trial cancels before the "wow" of a weekly energy trend lands. **Test a longer trial (14–30 days)**, which aligns the trial window with when Flowly's value actually becomes visible.
- **Action:** A/B 7-day vs 14-day vs 30-day trial; measure trial-to-paid, not just trial starts. (RevenueCat Experiments makes this a config change, not a release.)

#### Step 4 — Optimize pricing & packaging: push annual, keep the LatAm framing
- **Benchmark:** Yearly-dominant apps monetize installs **~2× better** at D14; nudging to annual maximizes early cash to reinvest in acquisition. H&F is **68% annual**. In LatAm specifically, anchoring the yearly plan to its **monthly equivalent** ("just $X/month") lifted trial starts **+30%** with no hit to trial-to-paid.
- **For Flowly:** It **already defaults to yearly and shows the monthly equivalent** (`R$ X/mês` in the paywall) — this matches the LatAm best practice; keep it. But the **monthly product ID typo (`flowly_montly`, §4.1-E) must be fixed** or you lose the monthly cohort entirely.
- **Action:** Fix the product ID; keep yearly-default + monthly-equivalent framing; test one higher-priced "AI/premium" tier later (see Step 7).

#### Step 5 — Localize the paywall by geography, not just translate it
- **Benchmark:** Paywall performance varies significantly by region; teams that localize *design, hierarchy, and social proof* (not just price) win. Always break down paywall experiments by geo.
- **For Flowly:** Only pt-BR works today; en-US is a dead end (§7-11). Brazil/LatAm is a **lower-LTV region** ($14–23 RLTV vs $32 in North America). Staying pt-BR-only caps the ceiling.
- **Action:** Ship i18n and expand to higher-LTV markets (North America/Western Europe); run **geo-segmented** paywall tests (layout + social proof + framing), not one global design.

#### Step 6 — Treat distribution as the product, and consider a web-to-app funnel
- **Benchmark:** Distribution is now *the* barrier. **Web-to-app is mainstream** (acquire/onboard/convert on web, then hand off to the app). Crucially, **web funnels should sell the *problem*** (users are earlier in consideration), and **discounted paid trials outperform free trials on web** (they filter out immediate cancelers and clean the ad-optimization signal).
- **For Flowly:** A **live marketing site already exists** at `flowly-web-coral.vercel.app` (Next.js, with problem-framed copy: *"Trabalhe com seu corpo e sua mente, não contra eles"*) — so the foundation for a web funnel is in place, but it's currently a static landing, not a conversion funnel. A web assessment funnel that educates on "working *with* your energy" (the problem) before introducing Flowly fits the differentiator perfectly and unlocks Meta/TikTok/Google channels IAP can't.
- **Action:** Extend the existing site into a web landing + energy-assessment funnel; test a discounted first month vs free trial on web; measure blended CAC → D35 conversion.

#### Step 7 — If you add AI, monetize it and defend retention aggressively
- **Benchmark:** AI apps earn **+41% revenue per payer** but **churn 30% faster**. Winners solve retention early; the rest ride curiosity and fade.
- **For Flowly:** Any AI coaching/summaries have real LLM cost — pair them with a **higher-priced tier** and design for stickiness (habit loops, streaks, weekly energy reviews), not novelty.
- **Action:** Only ship AI behind a premium tier with a retention mechanic attached; watch renewal cohorts, not just first payments.

#### Step 8 — Instrument the full funnel and commit to the 100+ day horizon
- **Benchmark:** Success is measured by **D35 download-to-paid**, **trial-to-paid**, **RPI at D14/D60**, and **renewal/retention cohorts** — and it takes **>100 days** to know if you have a top performer.
- **For Flowly:** It has Sentry (errors) but **no product/funnel analytics**. You cannot optimize what you can't see.
- **Action:** Add funnel analytics (install → onboarding step → trial start → paid → renewal), wire RevenueCat charts/experiments, set benchmark targets (aim ≥2.6% D35, top H&F RPI), and give the app a **≥100-day** runway of iteration before judging it.

### One-page summary

| Priority | Step | Report benchmark driving it | Flowly-specific action |
|----------|------|-----------------------------|-------------------------|
| P0 | 0. Fix defects | Day-0 decides; broken funnel = paid churn | Ship §7 P0 list (energy bug, gating, durable onboarding, unify API URL across build paths) |
| P0 | 2. Day-0 aha | 55% of trial cancels on Day 0 | Instant no-wearable energy curve; real score; populated first session |
| P0 | 1. Enforce paywall | Hard paywall = 5× conversion, 8–9× RPI | Re-enable gating; trial-gate the core loop |
| P1 | 4. Pricing/annual | Yearly ≈2× RPI; LatAm monthly-equiv +30% | Fix `flowly_montly`; keep yearly-default + "R$ X/mês" |
| P1 | 3. Trial length | 17+ day trials convert +70% | A/B 14–30 day trial |
| P1 | 8. Analytics | Judged on D35/RPI/retention over 100+ days | Add funnel analytics + RC experiments |
| P2 | 5. Localize paywall | Perf varies by geo; localize design | i18n + geo-segmented paywall tests |
| P2 | 6. Distribution/web | Distribution is the barrier; web-to-app wins | Web problem-first funnel; discounted first month |
| P2 | 7. AI monetization | AI +41% RPI but churns 30% faster | AI behind premium tier + retention loop |

**Bottom line from the data:** Flowly is in the right category (Health & Fitness monetizes best) with a genuine differentiator, but the market only rewards top performers and punishes broken funnels. The winning sequence is: **fix the P0 defects → guarantee a Day-0 aha (even without a wearable) → enforce a hard/trial paywall → nudge annual with the LatAm framing you already have → instrument the funnel → then invest in distribution and international reach.** Skip Step 0 and every dollar of growth spend accelerates the 1-star review in §9.4.
