/**
 * Trimmers opt-in para reduzir payloads grandes antes de persistir.
 *
 * A lib em si é genérica e não conhece o formato dos dados de domínio. Estes
 * helpers são puros (não acoplam a nenhuma chave) e ficam aqui apenas como
 * implementações prontas para o app registrar via `registerTrimmer`:
 *
 * ```ts
 * import { registerTrimmer, trimNutritionData, trimProfileData } from '@/lib/storage';
 *
 * registerTrimmer('nutrition_v2', trimNutritionData);
 * registerTrimmer('storage_v1', trimProfileData);
 * ```
 */

import { deepClone } from './helpers';
import type { PersistedRecord, PersistedValue } from './types';

function isRecord(value: unknown): value is PersistedRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Preserva entradas de `dietForLines` com `done` por linha (o trim agressivo
 * não pode apagar isso).
 */
function trimDietForLineEntry(entry: unknown): unknown {
  if (typeof entry === 'string') {
    return entry;
  }
  if (isRecord(entry)) {
    const trimmed: PersistedRecord = {};
    if (typeof entry.dietFor === 'string') trimmed.dietFor = entry.dietFor;
    if (Array.isArray(entry.done)) trimmed.done = [...entry.done];
    return Object.keys(trimmed).length > 0 ? trimmed : entry;
  }
  return entry;
}

/** Trimmer para dados de nutrição (lista de refeições com itens). */
export function trimNutritionData(data: PersistedValue): PersistedValue {
  if (!Array.isArray(data)) return data;

  return data.map((meal) => {
    if (!isRecord(meal)) return meal;

    const trimmedMeal = deepClone(meal);

    if (Array.isArray(trimmedMeal.items)) {
      trimmedMeal.items = trimmedMeal.items.map((item) => {
        if (!isRecord(item)) return item;

        const trimmedItem: PersistedRecord = {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          selectedUnitLabel: item.selectedUnitLabel,
          total_kcal: item.total_kcal,
          total_proteina: item.total_proteina,
          total_carbs: item.total_carbs,
          total_gordura: item.total_gordura,
          done: item.done,
          supplement: item.supplement,
        };

        if (typeof item.dietFor === 'string') {
          trimmedItem.dietFor = item.dietFor;
        }
        if (Array.isArray(item.dietForLines)) {
          trimmedItem.dietForLines = item.dietForLines.map(trimDietForLineEntry);
        }

        if (Array.isArray(item.swap) && item.swap.length > 0) {
          trimmedItem.swap = item.swap.slice(0, 3).map((swapOption) => {
            if (!isRecord(swapOption)) return swapOption;
            return {
              id: swapOption.id,
              name: swapOption.name,
              quantity: swapOption.quantity,
              selectedUnitLabel: swapOption.selectedUnitLabel,
            };
          });
        }

        return trimmedItem;
      });
    }

    return trimmedMeal;
  });
}

/** Trimmer para o perfil/storage principal (limita nutrição e treinos). */
export function trimProfileData(data: PersistedValue): PersistedValue {
  if (!isRecord(data)) return data;

  const trimmed = deepClone(data);

  if (Array.isArray(trimmed.nutrition)) {
    trimmed.nutrition = trimmed.nutrition.slice(0, 10).map((nutrition) => {
      if (!isRecord(nutrition)) return nutrition;

      const trimmedNutrition = deepClone(nutrition);

      if (Array.isArray(trimmedNutrition.items)) {
        trimmedNutrition.items = trimmedNutrition.items.slice(0, 20).map((item) => {
          if (!isRecord(item)) return item;
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            done: item.done,
            total_kcal: item.total_kcal,
            isChecked: item.isChecked,
          };
        });
      }

      return trimmedNutrition;
    });
  }

  if (Array.isArray(trimmed.trainning)) {
    trimmed.trainning = trimmed.trainning.slice(0, 10);
  }

  return trimmed;
}
