# Funil de ofertas: App Store Connect + RevenueCat

O app espera **três Offerings** no RevenueCat, cada um com um SKU anual diferente. Os preços cobrados vêm da Apple (e, se houver, do Google Play); o código só mapeia Offering → product ID.

| Passo do funil | Offering ID | Product ID (loja) | Preço alvo | Desconto |
| --- | --- | --- | --- | --- |
| 1 · Preço cheio | `default` | `flowly_yearly` | R$ 199,90 | — |
| 2 · Downsell | `downsell` | `flowly_yearly_20` | R$ 159,92 | 20% |
| 3 · Oferta final | `last_chance` | `flowly_yearly_60` | R$ 79,96 | 60% |

No app isso está em [`src/lib/subscription/offers.ts`](../src/lib/subscription/offers.ts). Os IDs de Offering podem ser sobrescritos por env (`EXPO_PUBLIC_RC_OFFERING_DEFAULT`, `_DOWNSELL`, `_LAST_CHANCE`).

**Regra crítica:** todo product ID anual precisa conter `year`, `annual` ou `anual` no nome. O app usa isso em `resolvePlanId` e o backend rejeita planos desconhecidos em `POST /subscription/payment`.

---

## Parte 1 — App Store Connect

### 1. Ajustar o produto anual atual

1. Abra [App Store Connect](https://appstoreconnect.apple.com) → seu app → **Subscriptions**.
2. Abra o grupo de assinaturas do Flowly (ou crie um, se ainda não existir).
3. Abra o produto `flowly_yearly` (ou o anual atual).
4. Em **Subscription Prices**, defina o preço para o Brasil em **R$ 199,90** (ou o tier da Apple mais próximo).
5. Confirme que há **Introductory Offer** (free trial) **somente** neste produto — os descontos não devem ter trial.

### 2. Criar o SKU de 20% off

1. No mesmo Subscription Group, clique em **+** para criar uma nova assinatura.
2. **Reference Name:** `Flowly Yearly 20% Off` (só interno).
3. **Product ID:** `flowly_yearly_20` — tem que ser exatamente este (ou atualize `productId` em `offers.ts` e rebuild).
4. Duração: **1 year**.
5. Preço Brasil: **R$ 159,92** (199,90 × 0,80). Se a Apple não tiver esse valor exato, escolha o tier mais próximo e ajuste o `fallbackPriceLabel` / copy se quiser.
6. **Não** configure introductory offer / free trial neste produto.
7. Salve e deixe em estado pronto para review / disponível para sandbox.

### 3. Criar o SKU de 60% off

1. Mesmo grupo, nova assinatura.
2. **Reference Name:** `Flowly Yearly 60% Off`.
3. **Product ID:** `flowly_yearly_60`.
4. Duração: **1 year**.
5. Preço Brasil: **R$ 79,96** (199,90 × 0,40).
6. Sem free trial.
7. Salve.

### 4. Checklist Apple

- [ ] Os três produtos estão no **mesmo Subscription Group** (a Apple trata upgrades/downgrades no mesmo grupo).
- [ ] Product IDs: `flowly_yearly`, `flowly_yearly_20`, `flowly_yearly_60`.
- [ ] Só `flowly_yearly` tem trial.
- [ ] Status permite compra em **Sandbox** (para testar no dispositivo).
- [ ] Conta Sandbox de teste criada em Users and Access → Sandbox.

> Se o preço anual atual no ASC ainda for R$ 197,00, atualize para R$ 199,90 (ou o tier equivalente). Até propagar, o app pode mostrar o valor antigo da loja — o fallback do código já é R$ 199,90.

---

## Parte 2 — RevenueCat

### 1. Importar / sincronizar produtos

1. Abra o projeto Flowly no [RevenueCat](https://app.revenuecat.com).
2. Vá em **Products** (ou **App Store apps** → Products).
3. Clique em **+ New** ou **Import from App Store**.
4. Confirme que aparecem:
   - `flowly_yearly`
   - `flowly_yearly_20`
   - `flowly_yearly_60`
   - (e o mensal `flowly_montly`, se já existir)

### 2. Entitlement

1. Vá em **Entitlements**.
2. Abra **`Flowly Pro`** (é o valor de `ENTITLEMENT_ID` no app).
3. Anexe **os três** produtos anuais (e o mensal) a este entitlement.
4. Sem isso, a compra pode concluir na loja e o app continuar bloqueado.

### 3. Offering `default` (passo 1)

1. Vá em **Offerings**.
2. Se já existe um offering com identifier `default`, edite-o; senão, crie com identifier **`default`**.
3. Marque-o como **Current** (é o fallback do SDK quando `downsell` / `last_chance` ainda não existem).
4. Adicione packages:
   - **Annual** → produto `flowly_yearly`
   - **Monthly** → produto `flowly_montly` (toggle do passo 1)
5. Salve.

### 4. Offering `downsell` (passo 2)

1. **+ New Offering**.
2. Identifier: **`downsell`** (minúsculo, exatamente assim).
3. Adicione um package **Annual** → produto `flowly_yearly_20`.
4. Não precisa de mensal neste offering.
5. Salve. **Não** marque como Current.

### 5. Offering `last_chance` (passo 3)

1. **+ New Offering**.
2. Identifier: **`last_chance`**.
3. Package **Annual** → produto `flowly_yearly_60`.
4. Salve. **Não** marque como Current.

### 6. Conferência rápida no RevenueCat

| Offering | Current? | Products |
| --- | --- | --- |
| `default` | Sim | `flowly_yearly` + `flowly_montly` |
| `downsell` | Não | `flowly_yearly_20` |
| `last_chance` | Não | `flowly_yearly_60` |

Todos os produtos → entitlement **Flowly Pro**.

---

## Parte 3 — Validar no app

1. Conta no servidor com `status: expired` ou `none` (sem `currentPeriodEnd` futuro).
2. Dev build / TestFlight com módulo nativo do RevenueCat (não Expo Go).
3. Conta Sandbox da Apple no dispositivo.
4. Abrir o app → passo 1 deve mostrar ~R$ 199,90 (da loja).
5. Fechar → passo 2 (~R$ 159,92) → fechar → passo 3 (~R$ 79,96).
6. Em cada passo, o checkout da Apple deve mostrar o product ID / preço daquele SKU.

### Se algo estiver errado

| Sintoma | Causa provável |
| --- | --- |
| Três passos com o mesmo preço | Offerings `downsell` / `last_chance` inexistentes → fallback para `current` |
| Evento `offering_missing` na telemetria | Identifier do Offering diferente do esperado (`default` / `downsell` / `last_chance`) |
| Compra ok na Apple, app ainda bloqueado | Produto não está no entitlement `Flowly Pro` |
| Backend rejeita o pagamento | Product ID sem `year`/`annual`/`anual` no nome |
| Trial aparece no desconto | Introductory offer configurada no SKU errado |

---

## Google Play (opcional, mesmo mapeamento)

Se for publicar no Android, crie assinaturas anuais com os **mesmos product IDs** e preços equivalentes, vincule-as no RevenueCat aos mesmos Offerings/packages. O app já resolve por `preferredProductId` e por período, independente da loja.
