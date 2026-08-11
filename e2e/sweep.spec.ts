/**
 * Varredura total do app.
 *
 * Enquanto os specs de tela verificam o que o app deve fazer, a varredura
 * verifica o que ele nunca pode fazer, em *qualquer* estado alcançável: erro de
 * console, promise rejeitada, requisição falhando fora da allowlist, texto bruto
 * na tela, error boundary e problema de acessibilidade nas regras que importam.
 *
 * Duas decisões definem o desenho:
 *
 * - **Um teste por raiz.** A varredura inteira em série levaria minutos; dividida
 *   por tela de entrada, os trechos rodam em paralelo (um worker cada) e o tempo
 *   de parede cai para o da raiz mais lenta. Cada raiz também isola a falha: o
 *   nome do teste já diz onde procurar.
 * - **Cada caminho parte de um app recém-aberto.** Relançar custa ~100ms, menos
 *   que desfazer o estado anterior — e evita o pior defeito de um crawler: acusar
 *   um problema que só existe porque a tela anterior ficou suja.
 *
 * Saída: `e2e/.report/sweep/<raiz>.json` com estados visitados, controles
 * exercitados e achados, mais um PNG por estado — publicado como artefato do CI.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { KNOWN_MISSING_ENDPOINTS } from './support/api';
import { expect, type LaunchOptions, TAB, test } from './support/fixtures';
import { findLeakedText } from './support/invariants';
import { auditAccessibility, clickControl, type Control, findCrashText, settle, waitForBoot } from './support/sweep';

/** Cliques além da entrada da raiz. */
const MAX_DEPTH = 2;
/** Tetos por raiz, para o gate ter tempo previsível. */
const MAX_STATES = 14;
const MAX_WALKS = 45;

const REPORT_DIR = join(__dirname, '.report', 'sweep');

type Root = {
  /** Nome do teste e do arquivo de relatório. */
  name: string;
  launch: LaunchOptions;
  /** Cliques que levam da abertura até a raiz. */
  entry?: string[];
  /** Piso de estados: menos que isto significa que a varredura travou na entrada. */
  minStates: number;
  /** Profundidade própria, para telas em sequência (padrão: `MAX_DEPTH`). */
  depth?: number;
};

/**
 * Raízes da varredura.
 *
 * As tabs entram como raízes separadas em vez de serem alcançadas por expansão:
 * é o que permite o paralelismo. Por isso os nomes das tabs — e o atalho para
 * Configurações — não são expandidos dentro de nenhuma raiz (ver `ROOT_CONTROLS`).
 */
const SETTINGS = 'Configurações';

const ROOTS: Root[] = [
  { name: 'home', launch: { scenario: 'premium', speech: true }, minStates: 10 },
  { name: 'calendario', launch: { scenario: 'premium' }, entry: [TAB.calendar], minStates: 3 },
  { name: 'andamento', launch: { scenario: 'premium' }, entry: [TAB.progress], minStates: 4 },
  { name: 'metas', launch: { scenario: 'premium' }, entry: [TAB.goals], minStates: 7 },
  { name: 'nova-atividade', launch: { scenario: 'premium' }, entry: [TAB.new], minStates: 7 },
  { name: 'configuracoes', launch: { scenario: 'premium' }, entry: [SETTINGS], minStates: 7 },
  // Trial vencido: o app abre direto no funil de paywall — sem barra de tabs,
  // por isso `waitForTabs: false`.
  { name: 'paywall', launch: { scenario: 'expiredTrial', waitForTabs: false }, minStates: 3 },
  { name: 'login', launch: { route: '/login', state: { token: null } }, minStates: 2 },
  { name: 'cadastro', launch: { route: '/create-account', state: { token: null } }, minStates: 2 },
  // Os 12 passos são um corredor: cada "Continuar" abre o próximo, então a
  // profundidade rasa das outras raízes não sairia do segundo passo.
  { name: 'onboarding', launch: { route: '/onboarding', state: { onboardingCompleted: false } }, depth: 6, minStates: 5 },
];

/** Coberto por raiz própria: expandir aqui repetiria o trabalho de outro worker. */
const ROOT_CONTROLS = new Set<string>([...Object.values(TAB), SETTINGS]);

type Finding = { path: string[]; kind: string; detail: string };
type Visit = { path: string[]; headings: string[]; controls: number; screenshot: string };

test.beforeAll(() => {
  mkdirSync(REPORT_DIR, { recursive: true });
});

test.describe('varredura', () => {
  for (const root of ROOTS) {
    test(`nenhum estado alcançável a partir de ${root.name} viola as invariantes`, async ({ app }) => {
      // Percorrer uma raiz não cabe no timeout padrão de um spec de tela.
      test.setTimeout(180_000);
      // A varredura provoca estados que os specs evitam; as invariantes são
      // cobradas aqui, caminho por caminho, com mensagem apontando o caminho.
      app.allowFailures();

      const entry = root.entry ?? [];
      const queue: Control[][] = [[]];
      const seenSignatures = new Set<string>();
      const clicked = new Set<string>();
      /** Controles que não abriram nada: entram no relatório, não reprovam. */
      const skipped = new Set<string>();
      const reportedConsole = new Set<string>();
      const findings: Finding[] = [];
      const visits: Visit[] = [];
      const exercised = new Set<string>();
      const axeByRule = new Map<string, number>();
      let walks = 0;

      while (queue.length > 0 && visits.length < MAX_STATES && walks < MAX_WALKS) {
        const path = queue.shift() as Control[];
        walks += 1;

        await app.launch(root.launch);
        await waitForBoot(app.page);

        const steps: Control[] = [...entry.map((name) => ({ name, role: 'button' })), ...path];
        let replayed = true;
        let before: string | undefined;

        for (let index = 0; index < steps.length; index += 1) {
          const step = steps[index] as Control;
          // Assentar antes de *cada* passo: um clique disparado enquanto a tela
          // anterior ainda anima é interceptado pelo overlay em transição e
          // esgota o teto do clique sem acertar nada.
          const current = await settle(app.page);
          // A assinatura de antes do último clique é o que permite ao `settle`
          // distinguir "a tela ainda não mudou" de "a tela já chegou".
          if (index === steps.length - 1) before = current.signature;

          replayed = await clickControl(app.page, step);
          if (!replayed) {
            // Um passo que sumiu não é falha do app: o caminho foi enfileirado a
            // partir de um estado que o relançamento não reproduz mais.
            skipped.add(step.name);
            break;
          }
        }
        if (!replayed) continue;

        const state = await settle(app.page, before);
        if (seenSignatures.has(state.signature)) continue;
        seenSignatures.add(state.signature);

        const trail = path.map((step) => step.name);
        const screenshot = `${root.name}-${visits.length}.png`;
        await app.page.screenshot({ path: join(REPORT_DIR, screenshot) });
        visits.push({ path: trail, headings: state.headings.slice(0, 3), controls: state.controls.length, screenshot });
        for (const control of state.controls) exercised.add(control.name);

        const report = (kind: string, detail: string) => findings.push({ path: trail, kind, detail });

        for (const error of app.console.relevant()) {
          // O observador de console acumula entre relançamentos; sem isto o mesmo
          // erro apareceria uma vez por caminho percorrido depois dele.
          if (reportedConsole.has(error)) continue;
          reportedConsole.add(error);
          report('console', error);
        }

        for (const call of app.api.failed(KNOWN_MISSING_ENDPOINTS)) report('request', `${call.method} ${call.path} → ${call.status}`);
        for (const leak of await findLeakedText(app.page)) report('texto-vazado', leak);

        const crash = await findCrashText(app.page);
        if (crash) report('error-boundary', crash);

        for (const violation of await auditAccessibility(app.page)) {
          axeByRule.set(violation.id, (axeByRule.get(violation.id) ?? 0) + violation.nodes);
          if (violation.impact === 'critical' || violation.impact === 'serious') {
            report('acessibilidade', `${violation.id} (${violation.nodes} nós): ${violation.help}`);
          }
        }

        if (path.length >= (root.depth ?? MAX_DEPTH)) continue;
        for (const control of state.controls) {
          if (ROOT_CONTROLS.has(control.name)) continue;
          // Um controle é acionado uma vez por profundidade. Sem poda a fila
          // cresce com o produto estados × controles e a varredura não termina;
          // podar só pelo nome travaria um assistente, onde o botão que avança
          // se chama "Continuar" em todos os passos.
          const key = `${path.length}:${control.name}`;
          if (clicked.has(key)) continue;
          clicked.add(key);
          queue.push([...path, control]);
        }
      }

      writeFileSync(
        join(REPORT_DIR, `${root.name}.json`),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            root: root.name,
            depth: root.depth ?? MAX_DEPTH,
            walks,
            statesVisited: visits.length,
            controlsExercised: [...exercised].sort(),
            controlsSkipped: [...skipped].sort(),
            axeByRule: Object.fromEntries([...axeByRule.entries()].sort()),
            visits,
            findings,
          },
          null,
          2,
        ),
      );

      // Piso de cobertura: sem ele, uma varredura que parou de andar (um rótulo
      // que mudou, por exemplo) entregaria relatório vazio e passaria batida.
      expect(visits.length, `estados visitados a partir de ${root.name}`).toBeGreaterThanOrEqual(root.minStates);
      expect(findings, `achados da varredura (relatório em ${REPORT_DIR}/${root.name}.json)`).toEqual([]);
    });
  }
});
