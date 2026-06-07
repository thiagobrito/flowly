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

## Estrutura de telas

- Telas em `src/screens/`
- Rotas em `app/`
- Reutilize tokens, cores e padrões visuais já usados em telas existentes antes de inventar novos.

## Verificação

Antes de considerar uma tarefa concluída:

1. O código compila sem erros de TypeScript.
2. Nenhum componente novo usa `export const X = (` ou `const X = (` para definir função/componente.
3. A mudança atende exatamente ao pedido, sem features extras.
