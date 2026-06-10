import { api } from '@/lib/network';

import type { ProgressData } from './types';

export async function fetchProgress(date: string): Promise<any> {
  const response = (await api.get<{ progress: ProgressData }>('/report', { params: { date } })) as any;
  return response.data;
}
