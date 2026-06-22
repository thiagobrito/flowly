import type { FlowlyEngineInput } from './types';

/** Reancora wakeTime/bedTime do input no dia selecionado, preservando os horários. */
export function anchorInputToDay(input: FlowlyEngineInput, day: Date): FlowlyEngineInput {
  if (!input.wakeTime) return input;

  const wakeSrc = new Date(input.wakeTime);
  if (Number.isNaN(wakeSrc.getTime())) return input;

  const wake = new Date(day);
  wake.setHours(wakeSrc.getHours(), wakeSrc.getMinutes(), 0, 0);

  let bedTime: string | null = null;
  if (input.bedTime) {
    const bedSrc = new Date(input.bedTime);
    if (!Number.isNaN(bedSrc.getTime())) {
      const deltaMs = bedSrc.getTime() - wakeSrc.getTime();
      bedTime = new Date(wake.getTime() + deltaMs).toISOString();
    }
  }

  return { ...input, wakeTime: wake.toISOString(), bedTime };
}
