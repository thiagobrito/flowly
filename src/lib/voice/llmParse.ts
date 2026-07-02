/**
 * # Voice — fallback LLM
 *
 * Segunda camada do modo híbrido de interpretação: quando o parser local
 * (`parse.ts`) não entende a fala, enviamos a transcrição para o backend
 * interpretar com uma LLM via `POST /ai/parse-task-field`.
 *
 * O endpoint ainda não existe no backend — enquanto isso (ou em falha de
 * rede/timeout), as funções retornam `null` e o assistente degrada pedindo
 * para o usuário repetir. Nenhum erro é propagado para a UI.
 */
import { api } from '@/lib/network';
import type { FrequencyConfig } from '@/screens/NewTask/data';
import { isFrequencyConfigValid } from '@/screens/NewTask/data';

import type { ParsedArea } from './parse';

const LLM_TIMEOUT_MS = 8_000;

type ParseFieldResponse = {
  frequency?: FrequencyConfig | null;
  area?: string | null;
};

async function parseField(field: 'frequency' | 'area', transcript: string, options?: string[]): Promise<ParseFieldResponse | null> {
  const trimmed = transcript.trim();
  if (!trimmed) return null;

  try {
    const response = await api.post<ParseFieldResponse>('/ai/parse-task-field', { field, transcript: trimmed, options, locale: 'pt-BR' }, { timeout: LLM_TIMEOUT_MS });
    return response ?? null;
  } catch {
    // Endpoint inexistente, offline ou timeout: degrada silenciosamente.
    return null;
  }
}

/** Tenta interpretar a resposta de "quando" via LLM. `null` se indisponível/inválida. */
export async function llmParseFrequency(transcript: string): Promise<FrequencyConfig | null> {
  const response = await parseField('frequency', transcript);
  const frequency = response?.frequency ?? null;
  // Valida a resposta da LLM antes de confiar nela.
  return isFrequencyConfigValid(frequency) ? frequency : null;
}

/**
 * Tenta interpretar a área via LLM, restrita às opções apresentadas na tela.
 * `null` se indisponível ou se a resposta não for uma das opções.
 */
export async function llmParseArea(transcript: string, options: Array<{ value: string; label: string }>): Promise<ParsedArea | null> {
  const response = await parseField(
    'area',
    transcript,
    options.map((option) => option.label),
  );
  const value = response?.area?.trim();
  if (!value) return null;

  const matched = options.find((option) => option.value === value || option.label.toLowerCase() === value.toLowerCase());
  return matched ?? null;
}
