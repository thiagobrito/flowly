import { ensureAndroidChannel, getPermissionStatus, getScheduledNotifications, notifications } from '@/lib/notifications';
import { getNotificationsConfig } from '@/lib/notifications/config';

import { cancelWeeklyReviewNotification, ensureWeeklyReviewNotification, WEEKLY_REVIEW_DATA_TYPE, WEEKLY_REVIEW_HOUR, WEEKLY_REVIEW_MINUTE, WEEKLY_REVIEW_WEEKDAY } from './notification';

jest.mock('@/lib/notifications', () => ({
  ensureAndroidChannel: jest.fn(),
  getPermissionStatus: jest.fn(),
  getScheduledNotifications: jest.fn(),
  notifications: { cancel: jest.fn(), scheduleWeekly: jest.fn() },
}));

jest.mock('@/lib/notifications/config', () => ({
  getNotificationsConfig: jest.fn(),
}));

const mockPermission = getPermissionStatus as jest.Mock;
const mockScheduled = getScheduledNotifications as jest.Mock;
const mockConfig = getNotificationsConfig as jest.Mock;
const reportError = jest.fn();

/** Notificação agendada com o `data.type` informado. */
const scheduled = (identifier: string, type?: string) => ({ identifier, content: { data: type ? { type } : {} } });

const mine = (identifier: string) => scheduled(identifier, WEEKLY_REVIEW_DATA_TYPE);

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.mockReturnValue({ telemetry: { reportError, addBreadcrumb: jest.fn() } });
  mockPermission.mockResolvedValue('granted');
  mockScheduled.mockResolvedValue([]);
});

describe('ensureWeeklyReviewNotification', () => {
  it('agenda um push semanal no domingo às 19h', async () => {
    await ensureWeeklyReviewNotification();

    expect(notifications.scheduleWeekly).toHaveBeenCalledTimes(1);
    expect(notifications.scheduleWeekly).toHaveBeenCalledWith(expect.objectContaining({ data: { type: WEEKLY_REVIEW_DATA_TYPE } }), WEEKLY_REVIEW_WEEKDAY, WEEKLY_REVIEW_HOUR, WEEKLY_REVIEW_MINUTE);
    expect(ensureAndroidChannel).toHaveBeenCalled();
  });

  it('não faz nada sem permissão concedida', async () => {
    mockPermission.mockResolvedValue('denied');

    await ensureWeeklyReviewNotification();

    expect(notifications.scheduleWeekly).not.toHaveBeenCalled();
  });

  // É chamada a cada abertura do app: reagendar duplicaria o push e reiniciaria
  // o ciclo semanal, fazendo a notificação nunca chegar para quem abre o app
  // todos os dias.
  it('é idempotente quando já existe um agendamento', async () => {
    mockScheduled.mockResolvedValue([mine('weekly-1')]);

    await ensureWeeklyReviewNotification();

    expect(notifications.scheduleWeekly).not.toHaveBeenCalled();
    expect(notifications.cancel).not.toHaveBeenCalled();
  });

  it('converge para um único agendamento quando há duplicatas', async () => {
    mockScheduled.mockResolvedValue([mine('weekly-1'), mine('weekly-2')]);

    await ensureWeeklyReviewNotification();

    expect(notifications.cancel).toHaveBeenCalledTimes(2);
    expect(notifications.scheduleWeekly).toHaveBeenCalledTimes(1);
  });

  it('ignora agendamentos de outros módulos ao decidir', async () => {
    mockScheduled.mockResolvedValue([scheduled('task-reminder-1', 'task_reminder'), scheduled('sem-tipo')]);

    await ensureWeeklyReviewNotification();

    expect(notifications.cancel).not.toHaveBeenCalled();
    expect(notifications.scheduleWeekly).toHaveBeenCalledTimes(1);
  });

  it('reporta a falha em vez de propagá-la para o boot', async () => {
    mockPermission.mockRejectedValue(new Error('sem módulo nativo'));

    await expect(ensureWeeklyReviewNotification()).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { source: 'ensureWeeklyReviewNotification' });
  });
});

describe('cancelWeeklyReviewNotification', () => {
  it('cancela só as notificações deste módulo', async () => {
    mockScheduled.mockResolvedValue([mine('weekly-1'), scheduled('task-reminder-1', 'task_reminder'), scheduled('sem-tipo')]);

    await cancelWeeklyReviewNotification();

    expect(notifications.cancel).toHaveBeenCalledTimes(1);
    expect(notifications.cancel).toHaveBeenCalledWith('weekly-1');
  });

  it('é no-op quando não há nada agendado', async () => {
    await cancelWeeklyReviewNotification();

    expect(notifications.cancel).not.toHaveBeenCalled();
  });

  it('engole falhas do módulo nativo', async () => {
    mockScheduled.mockRejectedValue(new Error('Expo Go'));

    await expect(cancelWeeklyReviewNotification()).resolves.toBeUndefined();
  });
});
