/**
 * # Paleta do app
 *
 * Fonte única das cores que carregam significado (energia alta/média/baixa,
 * acento de ação). Estavam duplicadas como literais em `heatColor`,
 * `Goals/data.ts`, `CalendarHourLabel` e `Calendar/theme.ts` — quatro lugares
 * onde "verde" tinha o mesmo valor por coincidência, não por contrato.
 *
 * ## Temperatura
 *
 * O app é quente: fundo creme, superfícies quase brancas com um resto de
 * amarelo, cinzas com base marrom. Cinza neutro sobre creme parece sujo, então
 * `mutedText` e as bordas puxam para o quente de propósito.
 *
 * ## Contraste
 *
 * Os fundos de energia são deliberadamente translúcidos e claros: o texto que
 * fica sobre eles é `zinc-800` (claro) / `zinc-100` (escuro), e opacidades
 * acima das definidas aqui derrubam o contraste abaixo de 4.5:1. Ao mexer
 * nesses valores, verifique o par fundo/texto — não só o fundo.
 */

/** Acento de ação e de identidade do produto (verde-floresta). */
export const ACCENT = '#2F6B4F';
export const ACCENT_LIGHT = '#6FA98A';

/**
 * O acento na variante que enxerga no tema atual.
 *
 * `ACCENT` é escuro o bastante para desaparecer contra o fundo do modo escuro.
 * Todo texto ou ícone de acento deve passar por aqui; só fundos sólidos (onde o
 * verde escuro é o que se quer) usam `ACCENT` direto.
 */
export function accentOn(isDark: boolean): string {
  return isDark ? ACCENT_LIGHT : ACCENT;
}

/** Acento de "agora"/hoje no calendário. */
export const ACCENT_TIME = '#B4713C';

const ACCENT_RGB = '47,107,79';

/**
 * Fundo/borda translúcidos do acento — a versão discreta do verde, para chips
 * selecionados, avisos e círculos de ícone.
 *
 * Existe para que "verde claro" tenha um valor só: espalhado como literal, ele
 * derivava para tons diferentes a cada tela.
 */
export function accentTint(alpha: number): string {
  return `rgba(${ACCENT_RGB},${alpha})`;
}

/**
 * Faixas de energia, do topo para o fundo.
 *
 * `low` é terracota, não vermelho: vermelho lê como erro, e energia baixa não é
 * falha do usuário. O produto promete o oposto — "dia ruim é previsto, não
 * punido".
 */
export const ENERGY = {
  high: '#4C9A6A',
  medium: '#D99A3C',
  low: '#C4704F',
} as const;

export type EnergyBandKey = keyof typeof ENERGY;

/** Score mínimo de cada faixa. */
export const ENERGY_THRESHOLDS = {
  high: 70,
  medium: 40,
} as const;

/** Faixa de energia de um score 0–100. */
export function energyBandKey(score: number): EnergyBandKey {
  if (score >= ENERGY_THRESHOLDS.high) return 'high';
  if (score >= ENERGY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/** Rótulo em pt-BR de cada faixa, para uso em texto e em `accessibilityLabel`. */
export const ENERGY_BAND_LABEL: Record<EnergyBandKey, string> = {
  high: 'energia alta',
  medium: 'energia média',
  low: 'energia baixa',
};

/** A mesma faixa em uma palavra, para chips e legendas onde não cabe a frase. */
export const ENERGY_BAND_SHORT: Record<EnergyBandKey, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/**
 * As mesmas faixas, escurecidas para uso em texto e ícone no tema claro.
 *
 * `ENERGY` é calibrado para preencher — traço do gráfico, bloco, ponto. Sobre o
 * creme, esses mesmos tons ficam entre 2,4:1 e 3,6:1: o âmbar não passa nem no
 * mínimo de 3:1 de elemento gráfico, quanto mais nos 4,5:1 de texto. Aqui a cor
 * mantém o matiz e ganha profundidade. No escuro os valores originais já
 * contrastam, então nada muda.
 */
const ENERGY_ON_LIGHT: Record<EnergyBandKey, string> = {
  high: '#2F7A50',
  medium: '#8F6318',
  low: '#A8502F',
};

/** A cor da faixa para texto e ícone — o par legível de `ENERGY`. */
export function energyText(band: EnergyBandKey, isDark: boolean): string {
  return isDark ? ENERGY[band] : ENERGY_ON_LIGHT[band];
}

const RGB: Record<EnergyBandKey, string> = {
  high: '76,154,106',
  medium: '217,154,60',
  low: '196,112,79',
};

/**
 * Fundo translúcido de uma faixa de energia.
 *
 * As opacidades são o teto que mantém `zinc-800` / `zinc-100` em contraste AA
 * sobre as superfícies do app.
 */
export function energySurface(band: EnergyBandKey, isDark: boolean): string {
  return `rgba(${RGB[band]},${isDark ? 0.22 : 0.14})`;
}

/** Borda de uma faixa de energia, um passo mais opaca que a superfície. */
export function energyBorder(band: EnergyBandKey, isDark: boolean): string {
  return `rgba(${RGB[band]},${isDark ? 0.4 : 0.3})`;
}

/**
 * Tom de energia para áreas grandes — a grade do calendário, por exemplo.
 *
 * `energySurface` é calibrado para chips e blocos de poucos centímetros. Na
 * altura de uma hora inteira, repetida 24 vezes, a mesma opacidade vira um
 * fundo colorido em que os eventos somem. Aqui a cor é um véu: dá para
 * perceber a faixa varrendo a tela sem competir com o conteúdo por cima.
 */
export function energyWash(band: EnergyBandKey, isDark: boolean): string {
  return `rgba(${RGB[band]},${isDark ? 0.1 : 0.07})`;
}

/** Superfície e borda dos cartões. Quase branco quente sobre o fundo creme. */
export const surface = {
  card: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.05)' : '#FFFDF9'),
  border: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(28,27,24,0.07)'),
  subtle: (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,27,24,0.04)'),
} as const;

/**
 * Fundo da aplicação, do topo para a base.
 *
 * Usado pelo gradiente em `app/index.tsx`. Fica aqui e não lá para o creme ter
 * um dono só — os cartões de `surface.card` são calibrados contra ele.
 */
export const BACKGROUND = {
  light: ['#F6F1E7', '#FAF7F0', '#FDFBF7'],
  dark: ['#151310', '#100E0C', '#000000'],
} as const;

/** Texto secundário. Cinza de base marrom, para não sujar sobre o creme. */
export const mutedText = (isDark: boolean) => (isDark ? '#A8A196' : '#6F6A5E');
