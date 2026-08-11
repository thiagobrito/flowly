---
name: e2e-explorer
description: Varredura exploratória adversarial do app Flowly num navegador real, via Playwright MCP, convertendo cada defeito encontrado em spec determinístico em e2e/specs/. Use quando pedirem para caçar bugs no app, explorar telas em busca de falha, testar entradas adversariais (texto longo, emoji, data inválida, duplo clique, offline no meio da ação) ou ampliar a suíte E2E a partir de exploração.
disable-model-invocation: true
---

# Explorador E2E

A suíte de `e2e/` é determinística e é gate de publicação: ela verifica o que **já
se sabe** que pode quebrar. Este fluxo é o oposto — dirige o app à mão procurando o
que ninguém pensou em testar, e o resultado útil não é o relatório: é o **spec novo**
que entra na suíte.

Nada aqui roda em CI nem no `build.py`. Um agente exploratório é lento e não
reprodutível; se ele virasse gate, o build passaria a falhar por motivo diferente a
cada execução.

## Fluxo

```
- [ ] 1. Subir o ambiente
- [ ] 2. Autenticar o navegador
- [ ] 3. Explorar com um roteiro adversarial
- [ ] 4. Classificar cada achado
- [ ] 5. Virar spec e provar que o spec falha antes de consertar
```

### 1. Subir o ambiente

```bash
npm run e2e:bundle                    # só se src/ mudou desde o último export
(cd ../web && npm run build)          # o next start serve o build, não o código
npm run e2e:explore                   # deixe rodando; Ctrl-C derruba tudo
```

`e2e:explore` sobe a API real com MongoDB em memória, serve o bundle na 4173 com
`/api/v1` repassado na **mesma origem** (sem CORS) e registra uma conta nova. Ele
imprime o `localStorage` da sessão — guarde essa linha para o passo 2.

Explorar contra a API real, e não contra as fixtures, é deliberado: metade dos
defeitos interessantes vive na costura entre app e backend, que a fixture esconde.

### 2. Autenticar o navegador

Com o Playwright MCP: navegue para `http://127.0.0.1:4173/`, cole a linha impressa
pelo `e2e:explore` em `browser_evaluate` e deixe o `location.reload()` no fim fazer
o app renascer autenticado. Sem isso o app abre em `/login`.

Para explorar estado diferente, mexa nas mesmas chaves: `onboarding_v2` com
`completed: false` cai no onboarding; remover `auth_session_v1` testa o guard de
rota; `sleep_profile_v1` ausente dispara o prompt de sono. A lista completa está em
`e2e/support/state.ts`.

### 3. Explorar com um roteiro adversarial

Navegue como usuário, mas com má intenção. O que rende achado, por ordem histórica
de acerto:

- **Entrada**: texto de 500 caracteres e emoji em nome de tarefa/meta (estoura
  layout, trunca no servidor?); só espaços; `<script>`; número negativo e `0` nos
  campos de meta; hora final antes da inicial no sono.
- **Concorrência**: duplo clique em "Criar atividade", "Concluir" e nos botões do
  paywall — o app cria duas? manda duas requisições?
- **Rede**: `browser_network_requests` para ver requisição duplicada no boot (loop
  de refetch do React Query); derrube a API (Ctrl-C no `e2e:explore`) no meio de uma
  ação e veja se o app mostra erro ou congela em spinner.
- **Volta e ida**: voltar do formulário com dados preenchidos; trocar de tab durante
  o carregamento; recarregar (F5) no meio de um fluxo de vários passos.
- **Tempo**: virar o dia (`e2e/support/fixtures.ts` mostra como fixar o relógio nos
  specs; aqui, mude o horário do sistema ou avance a data do sono).

Depois de cada passo, olhe `browser_console_messages` **antes** de olhar a tela: erro
de console aparece em defeito que a UI ainda não mostrou.

Onde **não** gastar tempo: o que a varredura (`sweep.spec.ts`) já cobre — clicar em
todo controle alcançável, texto vazado, error boundary, `axe-core`. Se a varredura
pega, não é trabalho de exploração.

### 4. Classificar cada achado

Antes de escrever spec, decida o que é:

| Achado | O que fazer |
|---|---|
| Defeito reproduzível | Spec que falha, depois o conserto (passo 5) |
| Comportamento intencional | Spec que fixa o comportamento, com comentário do porquê |
| Divergência fixture × API real | Corrigir `e2e/support/backend.ts`; a fixture é que está errada |
| Só reproduz com a API real | Spec em `e2e/integration/`, não em `e2e/specs/` |

Os 404 de `GET /onboarding` e `POST /ai/parse-task-field` **não** são achado: os dois
call sites degradam de propósito e já têm spec.

### 5. Virar spec

O spec tem de ser determinístico e rodar em modo mock, senão não pode ser gate:

1. Ajuste `e2e/support/backend.ts` (ou o cenário em `support/scenarios.ts`) para o
   estado que produziu o defeito.
2. Escreva o teste em `e2e/specs/<tela>.spec.ts`, seguindo o que já está lá:
   `app.launch()`, seletor por nome acessível, `app.tap`/`app.swipe`/`app.confirm`
   para o que o RN Web exige.
3. **Rode e veja falhar** — `npx playwright test --project=app -g "trecho do nome"`.
   Spec que passa antes do conserto não estava testando o defeito.
4. Conserte o produto, rode de novo, e rode a suíte inteira (`npm run e2e:only`) para
   garantir que o conserto não quebrou vizinho.

Ao terminar, relate: o roteiro percorrido, os achados com passos de reprodução, os
specs criados e o que ficou como suspeita não reproduzida.

## Detalhes que economizam tempo

- Mudança em `src/` só aparece depois de `npm run e2e:bundle`. Editar o produto e
  recarregar o navegador não faz nada.
- O `Alert` do RN Web é no-op; o bundle de E2E é exportado com o shim
  (`E2E_ALERT_SHIM=1`), então confirmação aparece como `role="dialog"` de verdade.
- Reconhecimento de fala não existe em navegador headless. Nos specs há um falso
  (`support/speech.ts`); na exploração, o assistente de voz só vai até o estado de
  escuta.
- Conta nova a cada `e2e:explore`, e o banco morre com o processo: para explorar o
  mesmo estado duas vezes, refaça os passos ou semeie via `../web/e2e/support/seed.ts`.
