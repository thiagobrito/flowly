# Diretrizes comportamentais (Karpathy)

Adaptado de [karpathy-guidelines](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/.cursor/rules/karpathy-guidelines.mdc) — diretrizes para reduzir erros comuns de LLM ao escrever, revisar ou refatorar código.

**Tradeoff:** estas regras priorizam cautela em vez de velocidade. Em tarefas triviais, use bom senso.

## 1. Pensar antes de codar

**Não assuma. Não esconda confusão. Exponha tradeoffs.**

Antes de implementar:

- Declare suas suposições explicitamente. Se houver dúvida, pergunte.
- Se existirem múltiplas interpretações, apresente-as — não escolha em silêncio.
- Se existir abordagem mais simples, diga. Contradiga quando fizer sentido.
- Se algo estiver unclear, pare. Nomeie o que confunde. Pergunte.

## 2. Simplicidade primeiro

**O mínimo de código que resolve o problema. Nada especulativo.**

- Nenhuma feature além do pedido.
- Nenhuma abstração para código de uso único.
- Nenhuma "flexibilidade" ou "configurabilidade" não solicitada.
- Nenhum tratamento de erro para cenários impossíveis.
- Se você escreveu 200 linhas e poderiam ser 50, reescreva.

Pergunte: "Um engenheiro sênior diria que isso está overcomplicated?" Se sim, simplifique.

## 3. Mudanças cirúrgicas

**Toque apenas no necessário. Limpe apenas a bagunça que você criou.**

Ao editar código existente:

- Não "melhore" código, comentários ou formatação adjacentes.
- Não refatore o que não está quebrado.
- Siga o estilo existente, mesmo que você faria diferente.
- Se notar código morto não relacionado, mencione — não delete.

Quando suas mudanças criarem código órfão:

- Remova imports/variáveis/funções que **suas** mudanças tornaram unused.
- Não remova código morto pré-existente, a menos que seja pedido.

**Teste:** cada linha alterada deve rastrear diretamente ao pedido do usuário.

## 4. Execução orientada a objetivo

**Defina critérios de sucesso. Itere até verificar.**

Transforme tarefas em metas verificáveis:

- "Adicionar validação" → escrever testes para inputs inválidos e fazê-los passar
- "Corrigir o bug" → escrever teste que reproduz e fazê-lo passar
- "Refatorar X" → garantir que os testes passam antes e depois

Para tarefas multi-etapa, declare um plano breve:

```
1. [Etapa] → verificar: [check]
2. [Etapa] → verificar: [check]
3. [Etapa] → verificar: [check]
```

Critérios de sucesso fortes permitem iterar de forma independente. Critérios fracos ("fazer funcionar") exigem clarificação constante.

---

**Estas diretrizes estão funcionando se:** houver menos mudanças desnecessárias nos diffs, menos reescritas por overcomplication, e perguntas de clarificação vierem **antes** da implementação em vez de depois dos erros.
