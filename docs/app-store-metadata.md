# Metadata da App Store (Guideline 3.1.2)

Fonte da verdade para a ficha do Flowly no App Store Connect. O pipeline em `build/` só envia o IPA — descrição, URLs legais e notes precisam ser conferidas aqui antes de cada submissão.

Apple ID: `6778602637` · bundle: `com.flowly-v2.app`

## URLs oficiais

| Campo | URL | Onde no ASC |
| --- | --- | --- |
| Termos de Uso (EULA padrão da Apple) | https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ | **App Description** (pt-BR e en-US). Não preencher EULA customizado. |
| Política de Privacidade | https://flowly-web-coral.vercel.app/privacy | App Information → Privacy Policy URL **e** no final da descrição |
| Suporte | https://flowly-web-coral.vercel.app/suporte | Support URL da versão |
| Marketing | https://flowly-web-coral.vercel.app/ | Marketing URL da versão |

No app, os mesmos links estão em [`src/lib/legal.ts`](../src/lib/legal.ts), no paywall (`LegalLinks`) e em Config → Legal.

## Checklist 3.1.2 (assinatura auto-renovável)

No **app** (já coberto pelo binário):

- Título da assinatura, duração e preço no fluxo de compra
- Links funcionais para EULA e Política de Privacidade
- Texto de renovação automática / cancelamento até 24h

Na **metadata**:

- Link do EULA na descrição (obrigatório se o EULA for o padrão da Apple)
- Privacy Policy URL preenchida
- Campo de EULA customizado **vazio**

## Descrição — Portuguese (Brazil)

Versão em review `2026.08.17` (atualizada via API em 18/08/2026). Limite: 4000 caracteres.

```
Pare de só planejar. Comece a executar.

O Flowly transforma sua visão em metas de 12 semanas, hábitos e uma rotina alinhada à sua energia — não contra ela.

PARA QUEM QUER RESULTADO, NÃO LISTA INFINITA

Produtividade não é fazer mais. É fazer o que importa quando você está no seu melhor.

Com o Flowly você:
• Define a visão de longo prazo e vira objetivo claro
• Quebra a meta em um ciclo de 12 semanas
• Descobre a única ação do dia que mais move o ponteiro
• Constrói hábitos com frequência, meta e sequência
• Organiza a rotina pelos seus horários de pico

GESTÃO DE ENERGIA

O app ajuda você a ver quando rende mais, quando o foco profundo aparece e o que drena ou recarrega. A rotina deixa de brigar com o corpo.

METAS DE 12 SEMANAS

Meta anual parece longe e se perde. Em 12 semanas você ganha prazo, urgência e um placar semanal para ajustar o curso.

SUA “ÚNICA COISA”

A maior causa de procrastinação é tentar tudo ao mesmo tempo. Todo dia o Flowly te devolve a uma pergunta: qual é a única coisa que, feita hoje, torna o resto mais fácil ou desnecessário?

HÁBITOS E EVOLUÇÃO

Crie hábitos no seu ritmo, acompanhe sequências e veja o progresso das metas, a consistência e as tendências de energia. Vitórias, aprendizados e ajustes ficam registrados — para o próximo ciclo começar mais inteligente que o anterior.

NÃO TRABALHE MAIS. TRABALHE MELHOR.

Gerencie sua energia. Encontre seus horários de pico. Construa hábitos que aguentam a semana real. Transforme objetivo em resultado.

Assinaturas auto-renováveis:
• Flowly Premium Mensal — 1 mês — preço exibido na App Store
• Flowly Premium Anual — 12 meses — preço exibido na App Store
A assinatura é renovada automaticamente, salvo cancelamento até 24h antes do fim do período. O pagamento é cobrado na conta da App Store. Gerencie em Ajustes > Assinaturas.

Termos de Uso (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Política de Privacidade: https://flowly-web-coral.vercel.app/privacy
```

## Descrição — English (US)

```
Stop planning. Start executing.

Flowly turns your vision into 12-week goals, habits, and a routine aligned with your energy — not against it.

RESULTS, NOT AN ENDLESS LIST

Productivity is not doing more. It is doing what matters when you are at your best.

With Flowly you can:
• Turn a long-term vision into a clear goal
• Break it into a 12-week execution cycle
• Find the one action today that moves the needle
• Build habits with frequency, targets, and streaks
• Plan your day around your peak hours

ENERGY MANAGEMENT

See when you perform best, when deep focus shows up, and what drains or restores you. Your routine stops fighting your body.

12-WEEK GOALS

A yearly goal feels far away and fades. In 12 weeks you get a deadline, urgency, and a weekly scoreboard so you can course-correct.

YOUR “ONE THING”

The biggest cause of procrastination is trying to do everything at once. Every day Flowly brings you back to one question: what is the one thing I can do today that makes everything else easier or unnecessary?

HABITS AND PROGRESS

Build habits at your pace, track streaks, and see goal progress, consistency, and energy trends. Wins, lessons, and adjustments stay on record — so the next cycle starts smarter than the last.

DON’T WORK MORE. WORK BETTER.

Manage your energy. Find your peak hours. Build habits that survive a real week. Turn a goal into a result.

Auto-renewable subscriptions:
• Flowly Premium Monthly — 1 month — price shown in the App Store
• Flowly Premium Yearly — 12 months — price shown in the App Store
The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Payment is charged to your App Store account. Manage in Settings > Subscriptions.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://flowly-web-coral.vercel.app/privacy
```

Preços na descrição ficam genéricos (“exibido na App Store”) porque os SKUs de desconto (`flowly_yearly_20`, `flowly_yearly_60`) mudam o valor cobrado.

## Notes (App Review Information)

Já gravadas na versão `2026.08.17`. Colar de novo em submissões futuras:

```
This app uses Apple’s standard EULA. The Terms of Use link is in the App Description and in the paywall (Termos de Uso / Política de Privacidade). Privacy Policy URL is set in App Information. Auto-renewing subscriptions show title, duration, and price on the purchase screen. Screen recording attached.

Where to verify in the binary:
1. Open the paywall (expired trial or Config).
2. Subscription line shows title, length, and price, e.g. “Flowly Premium Anual · 12 meses · R$ …”.
3. Tap “Termos de Uso (EULA)” → Apple Standard EULA (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/).
4. Tap “Política de Privacidade” → https://flowly-web-coral.vercel.app/privacy
The same links are in Config → Legal.
```

## Responder a rejeição 3.1.2 (sem novo binário)

A versão `2026.08.17` foi rejeitada por falta do link de EULA na descrição. Já feito via API:

- Descrição pt-BR e en-US com bloco de assinatura + URL do EULA
- Notes gravadas em App Review Information
- Vídeo `paywall-eula-privacy.mp4` anexado em App Review Information (paywall com título/duração/preço, depois a página do EULA padrão da Apple, depois `/privacy`)
- Cópia local: `~/Desktop/flowly-paywall-eula.mp4`

**Não enviar um IPA novo.** A Apple pediu um Reply no Resolution Center — anexos na versão sozinhos não reabrem a review.

1. Abra o [Resolution Center](https://appstoreconnect.apple.com/apps/6778602637/appstore/activity/ios/resolutioncenter) da versão rejeitada.
2. Reply com o texto abaixo e anexe `~/Desktop/flowly-paywall-eula.mp4` (ou grave no iPhone se preferir o binário nativo).
3. Não clique em Submit for Review de outro binário.

```
We use Apple’s standard EULA. The App Description now includes a functional Terms of Use (EULA) link (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) and the Privacy Policy URL. The Privacy Policy field in App Information is also set to https://flowly-web-coral.vercel.app/privacy.

In the app, the paywall shows the auto-renewing subscription title, duration, and price, plus functional links to the EULA and Privacy Policy (also available in Settings → Legal). Screen recording attached. No new binary is required.
```
