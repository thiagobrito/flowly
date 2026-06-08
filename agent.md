# Flowly — Guia do agente

Instruções persistentes para assistentes de IA que trabalham neste repositório.

## Stack

- React Native + Expo
- TypeScript
- Expo Router (`app/`)
- Telas e componentes em `src/`

## Declaração de funções e componentes

**Nunca** declare componentes ou funções exportadas como arrow function atribuída a `const`.

```tsx
// ❌ Evitar
export const TodayFocusScreen = ({
  overallProgress,
  focus,
}: TodayFocusProps) => {
  return <View>...</View>;
};

const ProgressRing = ({ value }: ProgressRingProps) => (
  <Svg>...</Svg>
);
```

```tsx
// ✅ Preferir
export function TodayFocusScreen({
  overallProgress,
  focus,
}: TodayFocusProps) {
  return <View>...</View>;
}

function ProgressRing({ value }: ProgressRingProps) {
  return <Svg>...</Svg>;
}
```

### Regras

- Use `function Nome({ ... })` para componentes React, hooks customizados e helpers exportados.
- Arrow functions (`=>`) ficam restritas a callbacks inline (handlers, `map`, `useCallback`, etc.).
- Constantes de módulo (`const SLOT_FOCUS = 1`) continuam válidas — a regra vale para **funções**, não para valores.

## Estilo de código

- Siga o padrão já presente no arquivo que está editando.
- Prefira mudanças cirúrgicas; não refatore código adjacente sem pedido.
- Mantenha tipos explícitos em props públicas e exports.
- Comentários só quando a intenção não for óbvia pelo código.

## Formatação JSX

O projeto usa Prettier (`printWidth: 100`, `singleAttributePerLine: false`). Elementos JSX **cabem em uma linha** quando couberem dentro do limite — não quebre props em múltiplas linhas por estilo.

```tsx
// ❌ Evitar (quebra desnecessária)
<TrendingUp
  size={13}
  color="#3b82f6"
  style={{ marginRight: 6 }}
/>

// ✅ Preferir
<TrendingUp size={13} color="#3b82f6" style={{ marginRight: 6 }} />
```

### Regras

- Ícones, componentes pequenos e tags com poucas props: **uma linha**.
- Quebra em múltiplas linhas só quando a linha ultrapassar ~100 caracteres (Prettier decide).
- Não force quebra manual; deixe o Prettier/ESLint formatar com `npm run format` ou `eslint --fix`.

## Estrutura de telas

- Telas em `src/screens/`
- Rotas em `app/`
- Reutilize tokens, cores e padrões visuais já usados em telas existentes antes de inventar novos.

## Verificação

Antes de considerar uma tarefa concluída:

1. O código compila sem erros de JavaScript ou TypeScript (de acordo com o arquivo).
2. Nenhum componente novo usa `export const X = (` ou `const X = (` para definir função/componente.
3. A mudança atende exatamente ao pedido, sem features extras.
