import { api } from '@/lib/network';

import type { ProgressData } from './types';

export async function fetchProgress(_date?: string): Promise<any> {
  const response = (await api.get<{ progress: ProgressData }>('/report', { params: { date: _date ?? '' } })) as any;
  return response.data;
}
