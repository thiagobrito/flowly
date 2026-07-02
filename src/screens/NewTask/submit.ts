import { Alert } from 'react-native';

import { api } from '@/lib/network';
import { syncTaskReminders } from '@/lib/taskReminders';

import type { NewTaskPayload } from './data';

export type SubmitTaskPayload = NewTaskPayload & {
  id?: string;
  isEditing?: boolean;
};

export type SubmitTaskOptions = {
  /** Fila de sincronização pendente (de `usePendingSync`). */
  enqueue: (method: 'PUT', path: string, payload: unknown) => void;
  /** Preferência de lembretes de tarefas (de `useConfigPreferences`). */
  remindersEnabled: boolean;
};

export type SubmitTaskResult = 'saved' | 'queued' | 'retry';

/**
 * Salva (ou edita) uma atividade com o mesmo comportamento do formulário
 * NewTask: `PUT /tasks`; em falha de rede oferece tentar de novo ou guardar
 * na fila pendente. Compartilhado entre o formulário e o assistente de voz.
 *
 * Retorna `'retry'` quando o usuário escolheu tentar novamente (o chamador
 * mantém o estado preenchido), `'queued'` quando a escrita foi enfileirada e
 * `'saved'` no sucesso.
 */
export async function submitTask(payload: SubmitTaskPayload, { enqueue, remindersEnabled }: SubmitTaskOptions): Promise<SubmitTaskResult> {
  // A atividade já foi salva (ou enfileirada); falha no agendamento de
  // lembretes não deve travar o fluxo.
  const syncReminders = () => syncTaskReminders({ enabled: remindersEnabled, tasksHint: [payload as never] }).catch(() => undefined);

  try {
    await api.put(`/tasks`, payload);
  } catch {
    return new Promise<SubmitTaskResult>((resolve) => {
      Alert.alert(
        'Não foi possível salvar',
        payload.isEditing ? 'Verifique sua conexão e tente novamente. Se preferir, salvamos as alterações assim que a conexão voltar.' : 'Verifique sua conexão e tente novamente. Se preferir, criamos a atividade assim que a conexão voltar.',
        [
          { text: 'Tentar novamente', style: 'cancel', onPress: () => resolve('retry') },
          {
            text: 'Salvar depois e continuar',
            onPress: () => {
              enqueue('PUT', '/tasks', payload);
              syncReminders().finally(() => resolve('queued'));
            },
          },
        ],
      );
    });
  }

  await syncReminders();
  return 'saved';
}
