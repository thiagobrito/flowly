import type { CalendarKitHandle, DateOrDateTime, OnEventResponse, PackedEvent, RenderHourProps } from '@howljs/calendar-kit';
import { CalendarBody, CalendarContainer } from '@howljs/calendar-kit';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckIcon, TrendingUp, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { APP_TIME_ZONE, localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { hasGoogleClientIds, useGoogleCalendarSync } from '@/lib/googleCalendar';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import { cancelTaskRemindersFor, syncTaskReminders } from '@/lib/taskReminders';

import { useConfigPreferences } from '../Config/hooks/useConfigPreferences';
import type { ScheduledSlot, Subtask, Task } from '../NewTask/data';
import { formatDuration, getLifeArea } from '../NewTask/data';
import LevelDots from '../Tasks/components/LevelDots';
import CalendarHeaderBar from './components/CalendarHeaderBar';
import CalendarHourLabel from './components/CalendarHourLabel';
import TaskDetailModal from './components/TaskDetailModal';
import UnscheduledTray from './components/UnscheduledTray';
import type { CalendarTaskEvent } from './eventMapping';
import { buildCalendarEvents, getTaskDurationMin } from './eventMapping';
import { useDayEnergyLevels } from './hooks/useDayEnergyLevels';
import { getTaskSlot, hasScheduleChanged, onceFrequencyFromISO, syncTaskDetailsToServer, syncTaskEstimatedMinutesToServer, syncTaskScheduleToServer, syncTaskSubtasksToServer, syncTaskUnscheduleToServer } from './scheduleSync';
import { buildCalendarTheme } from './theme';

type CalendarProps = {
  onEdit?: (task: Task) => void;
  onCreateAt?: (dateTimeISO: string) => void;
};

const DOUBLE_PRESS_MS = 300;
const DRAG_STEP_MIN = 15;
/** Duração mínima de exibição de um evento, garantindo altura suficiente para o texto não ser cortado. */
const MIN_EVENT_MINUTES = 45;
/** Largura da coluna de horários (default `HOUR_WIDTH` do calendar-kit). */
const HOUR_WIDTH = 80;
/** Altura da barra de dias do calendar-kit (default 60) + borda inferior (1px). */
const DAY_BAR_HEIGHT = 61;
/** Espaço entre a barra de dias e a primeira linha de hora (`spaceFromTop` do calendar-kit). */
const SPACE_FROM_TOP = 16;
/**
 * Distância vertical exata entre o topo do calendário (`calendarWrapRef`) e a
 * linha da hora inicial da grade. Substitui a antiga constante aproximada que
 * causava desvio na identificação do horário ao arrastar/soltar.
 */
const GRID_TOP_OFFSET = DAY_BAR_HEIGHT + SPACE_FROM_TOP;

/** Largura do card-fantasma exibido durante o arraste. */
const GHOST_WIDTH = 100;
/** Deslocamento horizontal: o dedo fica centralizado no card. */
const GHOST_OFFSET_X = GHOST_WIDTH / 2;
/**
 * Deslocamento vertical: o topo do card-fantasma fica acima do dedo. O horário
 * de início é resolvido a partir do topo visível do card (e não do dedo), para
 * que a tarefa seja agendada exatamente onde o usuário a enxerga.
 */
const GHOST_OFFSET_Y = 28;

type DragState = {
  task: Task;
  x: number;
  y: number;
};

type CalendarBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PT_LOCALE = {
  weekDayShort: 'Dom_Seg_Ter_Qua_Qui_Sex_Sáb'.split('_'),
  meridiem: { ante: 'AM', post: 'PM' },
  more: 'mais',
};

/** Arredonda um ISO para o múltiplo de minutos mais próximo (ex.: 15min). */
function snapISOToStep(iso: string, stepMin: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const stepMs = stepMin * 60_000;
  return toLocalISOString(new Date(Math.round(date.getTime() / stepMs) * stepMs));
}

function organizeTasks(tasks: unknown): Task[] {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task, index) => {
    const item = task as Task & { _id?: string };
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    const id = item.id ?? item._id ?? '';
    return {
      ...item,
      id,
      // Chave estável entre refetches (id + posição) para o React reconciliar as listas.
      randomId: `${id || 'task'}-${index}`,
    };
  });
}

export default function Calendar({ onEdit, onCreateAt }: CalendarProps) {
  const isDark = useColorScheme() === 'dark';
  const { preferences } = useConfigPreferences();
  const remindersEnabled = preferences.taskRemindersEnabled ?? true;
  const remindersEnabledRef = useRef(remindersEnabled);
  remindersEnabledRef.current = remindersEnabled;
  const calendarRef = useRef<CalendarKitHandle>(null);
  const calendarWrapRef = useRef<View>(null);
  const screenRootRef = useRef<View>(null);
  const calendarBounds = useRef<CalendarBounds | null>(null);
  const screenOrigin = useRef({ x: 0, y: 0 });
  const lastPress = useRef<{ id: string; ts: number }>({ id: '', ts: 0 });
  const singlePressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const [visibleDate, setVisibleDate] = useState<string>(() => toLocalISOString());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStartISO, setSelectedStartISO] = useState<string | undefined>(undefined);

  const visibleDateRef = useRef(visibleDate);
  visibleDateRef.current = visibleDate;

  const calendarDateKey = localDateKey(startOfLocalDay(visibleDate));
  const calendarKey = useMemo(() => queryKeys.tasksCalendar(calendarDateKey), [calendarDateKey]);
  const calendarKeyRef = useRef(calendarKey);
  calendarKeyRef.current = calendarKey;

  const tasksQuery = useQuery<Task[]>({
    queryKey: calendarKey,
    queryFn: async () => {
      const response = await api.get<any>('/tasks', { params: { date: visibleDateRef.current, energyLevel: 5 } });
      const visible = [...response.visibleTasks.map((task: Task) => ({ ...task, done: false })), ...response.concludedTasks.map((task: Task) => ({ ...task, done: true }))];
      return organizeTasks(visible);
    },
    // Mantém o dia anterior visível durante a troca de datas (sem tela vazia).
    placeholderData: keepPreviousData,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const loading = tasksQuery.isLoading;

  // Atualiza otimisticamente o cache do dia visível (sem esperar o servidor).
  const setCalendarTasks = useCallback(
    (updater: (prev: Task[]) => Task[]) => {
      queryClient.setQueryData<Task[]>(calendarKeyRef.current, (prev) => updater(prev ?? []));
    },
    [queryClient],
  );

  // Revalida todas as listas de tarefas (Home e Calendar compartilham o prefixo).
  const refetchTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll() });
  }, [queryClient]);

  const {
    isConnected,
    pending: syncPending,
    syncNow,
  } = useGoogleCalendarSync({
    onSynced: () => refetchTasks(),
    onError: () => Alert.alert('Erro na sincronização', 'Não foi possível importar os eventos do Google Calendar. Tente novamente.'),
  });

  const googleSyncEnabled = hasGoogleClientIds() && isConnected;

  const handleGoogleSync = useCallback(() => {
    syncNow().catch(() => undefined);
  }, [syncNow]);

  const clearSinglePressTimer = useCallback(() => {
    if (singlePressTimer.current) {
      clearTimeout(singlePressTimer.current);
      singlePressTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearSinglePressTimer(), [clearSinglePressTimer]);

  const visibleDateKeys = useMemo(() => {
    const start = startOfLocalDay(visibleDate);
    return new Set([localDateKey(start)]);
  }, [visibleDate]);

  const { events, unscheduled } = useMemo(() => buildCalendarEvents(tasks, visibleDateKeys), [tasks, visibleDateKeys]);
  const theme = useMemo(() => buildCalendarTheme(isDark), [isDark]);
  const { getLevel, hasData } = useDayEnergyLevels(visibleDate);

  const renderHour = useCallback(({ hourStr, minutes, style }: RenderHourProps) => <CalendarHourLabel hourStr={hourStr} style={style} level={hasData ? getLevel(minutes) : undefined} isDark={isDark} />, [getLevel, hasData, isDark]);

  const renderCalendarEvent = useCallback(
    (event: PackedEvent) => {
      const { task } = event as unknown as CalendarTaskEvent;
      const showEnergyAndImpact = task?.estimatedMinutes && task?.estimatedMinutes >= 60;

      return (
        <View className="flex flex-1 flex-col gap-2">
          <View className="flex flex-row items-center justify-between">
            <Text className="max-w-[250px]" numberOfLines={2} style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#fafafa' : '#1f2937' }}>
              {event.title}
            </Text>
            {task.done ? <CircleCheckIcon className="my-auto flex justify-end" size={22} color="white" /> : null}
          </View>

          {showEnergyAndImpact ? (
            <View
              className="-mt-1 flex-row items-center"
              style={{
                alignSelf: 'flex-start',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.6)',
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <View className="flex-row items-center" style={{ marginRight: 14 }}>
                <Zap size={13} color="#22c55e" style={{ marginRight: 6 }} />
                <LevelDots value={task.energy || 0} accent="#22c55e" isDark={isDark} />
              </View>

              <View className="flex-row items-center">
                <TrendingUp size={13} color="#3b82f6" style={{ marginRight: 6 }} />
                <LevelDots value={task.impact || 0} accent="#3b82f6" isDark={isDark} />
              </View>
            </View>
          ) : null}
        </View>
      );
    },
    [isDark],
  );

  const dateLabel = useMemo(() => {
    const date = new Date(visibleDate);
    if (Number.isNaN(date.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    return formatter.format(date);
  }, [visibleDate]);

  const syncCalendarBounds = useCallback(() => {
    calendarWrapRef.current?.measureInWindow((x, y, width, height) => {
      calendarBounds.current = { x, y, width, height };
    });
    screenRootRef.current?.measureInWindow((x, y) => {
      screenOrigin.current = { x, y };
    });
  }, []);

  const resolveDropISO = useCallback((fingerX: number, fingerY: number): string | null => {
    const bounds = calendarBounds.current;
    if (!bounds) return null;

    // O horário é resolvido a partir do topo visível do card-fantasma (o dedo
    // fica `GHOST_OFFSET_Y` abaixo) e do seu centro horizontal.
    const anchorX = fingerX;
    const anchorY = fingerY - GHOST_OFFSET_Y;

    const scrollY = 60 + (calendarRef.current?.getCurrentOffsetY() ?? 0);
    const gridX = anchorX - bounds.x - HOUR_WIDTH;
    const gridY = anchorY - bounds.y - GRID_TOP_OFFSET + scrollY;

    if (gridX < 0 || gridY < 0 || gridX > bounds.width - HOUR_WIDTH || anchorY > bounds.y + bounds.height) {
      return null;
    }

    const iso = calendarRef.current?.getDateByOffset({ x: gridX, y: gridY });
    return iso ? snapISOToStep(iso, DRAG_STEP_MIN) : null;
  }, []);

  const handleLongPressBackground = useCallback(
    (selection: DateOrDateTime) => {
      if (selection.dateTime) onCreateAt?.(selection.dateTime);
    },
    [onCreateAt],
  );

  const handleDragStart = useCallback((task: Task, x: number, y: number) => {
    calendarWrapRef.current?.measureInWindow((bx, by, width, height) => {
      calendarBounds.current = { x: bx, y: by, width, height };
    });
    screenRootRef.current?.measureInWindow((ox, oy) => {
      screenOrigin.current = { x: ox, y: oy };
      setDrag({ task, x, y });
    });
  }, []);

  const handleDragMove = useCallback((x: number, y: number) => {
    setDrag((current) => (current ? { ...current, x, y } : current));
  }, []);

  const restoreTask = useCallback(
    (snapshot: Task) => {
      setCalendarTasks((prev) => prev.map((item) => (item.id === snapshot.id ? snapshot : item)));
    },
    [setCalendarTasks],
  );

  const applyScheduleLocally = useCallback(
    (taskId: string, slot: ScheduledSlot) => {
      setCalendarTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, schedule: [slot] } : item)));
    },
    [setCalendarTasks],
  );

  const clearScheduleLocally = useCallback(
    (taskId: string) => {
      setCalendarTasks((prev) =>
        prev.map((item) => {
          if (item.id !== taskId) return item;
          const next: Task = { ...item, schedule: [] };
          if (item.frequency.kind === 'once') next.frequency = { kind: 'notime' };
          return next;
        }),
      );
    },
    [setCalendarTasks],
  );

  const scheduleAndSyncTask = useCallback(
    async (task: Task, startISO: string, durationMin: number) => {
      const dateKey = localDateKey(new Date(startISO));
      const previous = getTaskSlot(task, dateKey);
      if (!hasScheduleChanged(previous, startISO, durationMin)) return;

      const snapshot = task;
      applyScheduleLocally(task.id, { dateTime: startISO, duration: durationMin });

      const taskHint: Task = task.frequency.kind === 'once' ? { ...task, frequency: onceFrequencyFromISO(startISO) } : { ...task, schedule: [{ dateTime: startISO, duration: durationMin }] };

      try {
        await syncTaskScheduleToServer(task, startISO, durationMin);
        refetchTasks();
        await syncTaskReminders({ enabled: remindersEnabledRef.current, tasksHint: [taskHint] });
      } catch {
        restoreTask(snapshot);
      }
    },
    [applyScheduleLocally, refetchTasks, restoreTask],
  );

  const removeFromDayAndSyncTask = useCallback(
    async (task: Task, dateKey: string) => {
      const snapshot = task;
      clearScheduleLocally(task.id);

      try {
        await syncTaskUnscheduleToServer(task, dateKey);
        refetchTasks();
        await syncTaskReminders({ enabled: remindersEnabledRef.current });
      } catch {
        restoreTask(snapshot);
      }
    },
    [clearScheduleLocally, refetchTasks, restoreTask],
  );

  const markTaskAsDone = useCallback(
    // `completionISO` reflete o dia que está sendo visualizado (não "hoje"): ao
    // concluir uma tarefa no calendário de outro dia, a conclusão é registrada
    // no dia correto.
    async (task: Task, completionISO: string) => {
      const snapshot = task;
      setCalendarTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: true } : item)));

      try {
        await api.post('/tasks/complete', { taskId: task.id, date: completionISO });
        await cancelTaskRemindersFor(task.id);
        refetchTasks();
      } catch {
        restoreTask(snapshot);
      }
    },
    [setCalendarTasks, refetchTasks, restoreTask],
  );

  const toggleSubtask = useCallback(
    async (task: Task, subtaskId: string) => {
      const current = task.subtasks?.find((item) => item.id === subtaskId);
      if (!current) return;

      const nextDone = !current.done;
      const snapshot = task;
      setCalendarTasks((prev) =>
        prev.map((item) => {
          if (item.id !== task.id) return item;
          return {
            ...item,
            subtasks: (item.subtasks ?? []).map((subtask) => (subtask.id === subtaskId ? { ...subtask, done: nextDone } : subtask)),
          };
        }),
      );

      try {
        await api.post('/tasks/subtask', { taskId: task.id, subtaskId, done: nextDone });
      } catch {
        restoreTask(snapshot);
      }
    },
    [setCalendarTasks, restoreTask],
  );

  const saveSubtasks = useCallback(
    async (task: Task, nextSubtasks: Subtask[]) => {
      const snapshot = task;
      setCalendarTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, subtasks: nextSubtasks } : item)));

      try {
        await syncTaskSubtasksToServer(task, nextSubtasks);
        refetchTasks();
      } catch {
        restoreTask(snapshot);
      }
    },
    [setCalendarTasks, refetchTasks, restoreTask],
  );

  const saveTaskDetails = useCallback(
    async (task: Task, details: { name: string; description: string }) => {
      const snapshot = task;
      setCalendarTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, name: details.name, description: details.description } : item)));

      try {
        await syncTaskDetailsToServer(task, details);
        refetchTasks();
      } catch {
        restoreTask(snapshot);
      }
    },
    [setCalendarTasks, refetchTasks, restoreTask],
  );

  const closeTaskDetail = useCallback(() => {
    setSelectedTask(null);
    setSelectedStartISO(undefined);
  }, []);

  const handleModalEdit = useCallback(
    (task: Task) => {
      closeTaskDetail();
      onEdit?.(task);
    },
    [closeTaskDetail, onEdit],
  );

  const handleModalComplete = useCallback(
    (task: Task) => {
      const completionISO = selectedStartISO ?? visibleDateRef.current;
      closeTaskDetail();
      markTaskAsDone(task, completionISO);
    },
    [closeTaskDetail, markTaskAsDone, selectedStartISO],
  );

  const handleModalRemoveFromDay = useCallback(
    (task: Task) => {
      const startISO = selectedStartISO;
      if (!startISO) return;
      const dateKey = localDateKey(new Date(startISO));
      closeTaskDetail();
      removeFromDayAndSyncTask(task, dateKey);
    },
    [closeTaskDetail, removeFromDayAndSyncTask, selectedStartISO],
  );

  const handleModalDelete = useCallback(
    (task: Task) => {
      closeTaskDetail();
      Alert.alert('Deletar atividade', `Deseja remover "${task.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            const snapshot = task;
            setCalendarTasks((prev) => prev.filter((item) => item.id !== task.id));
            try {
              await api.delete('/tasks', { params: { id: task.id } });
              await cancelTaskRemindersFor(task.id);
              refetchTasks();
            } catch {
              setCalendarTasks((prev) => (prev.some((item) => item.id === snapshot.id) ? prev : [...prev, snapshot]));
              Alert.alert('Erro', 'Não foi possível deletar a atividade.');
            }
          },
        },
      ]);
    },
    [closeTaskDetail, refetchTasks, setCalendarTasks],
  );

  const handleModalDurationChange = useCallback(
    async (task: Task, durationMin: number) => {
      const startISO = selectedStartISO;
      const snapshot = task;
      const isOnce = task.frequency.kind === 'once';

      setCalendarTasks((prev) =>
        prev.map((item) => {
          if (item.id !== task.id) return item;

          const next: Task = { ...item, estimatedMinutes: durationMin };
          // Em `once`, a duração é o estimatedMinutes (getTaskSlot usa getTaskDurationMin).
          // Em recorrentes, atualiza só o slot do dia sem apagar os demais.
          if (startISO && !isOnce) {
            const dateKey = localDateKey(new Date(startISO));
            const previousSlot = getTaskSlot(item, dateKey);
            const slot: ScheduledSlot = {
              dateTime: previousSlot?.dateTime ?? startISO,
              duration: durationMin,
            };
            const existing = Array.isArray(item.schedule) ? item.schedule : [];
            const others = existing.filter((s) => Boolean(s?.dateTime) && localDateKey(new Date(s.dateTime)) !== dateKey);
            next.schedule = [...others, slot];
          }
          return next;
        }),
      );

      try {
        await syncTaskEstimatedMinutesToServer(task, durationMin);
        if (startISO && !isOnce) {
          await syncTaskScheduleToServer(task, startISO, durationMin);
        }
        if (startISO) {
          const taskHint: Task = isOnce ? { ...task, estimatedMinutes: durationMin, frequency: onceFrequencyFromISO(startISO) } : { ...task, estimatedMinutes: durationMin, schedule: [{ dateTime: startISO, duration: durationMin }] };
          await syncTaskReminders({ enabled: remindersEnabledRef.current, tasksHint: [taskHint] });
        }
        refetchTasks();
      } catch {
        restoreTask(snapshot);
      }
    },
    [refetchTasks, restoreTask, selectedStartISO, setCalendarTasks],
  );

  const handleDragEnd = useCallback(
    (task: Task, x: number, y: number) => {
      const dropISO = resolveDropISO(x, y);

      if (dropISO) {
        scheduleAndSyncTask(task, dropISO, getTaskDurationMin(task));
      }

      setDrag(null);
    },
    [resolveDropISO, scheduleAndSyncTask],
  );

  const showTaskActions = useCallback(
    (task: Task, startISO?: string) => {
      const buttons: any = [];
      if (!task.done) {
        // Usa o horário do evento (dia visível) quando disponível; senão, o dia
        // atualmente visível no calendário.
        const completionISO = startISO ?? visibleDateRef.current;
        buttons.push({ text: 'Concluir tarefa', onPress: () => markTaskAsDone(task, completionISO) });
      }
      buttons.push({ text: 'Editar', onPress: () => onEdit?.(task) });

      if (startISO) {
        const dateKey = localDateKey(new Date(startISO));
        buttons.push({ text: 'Remover do dia', style: 'destructive', onPress: () => removeFromDayAndSyncTask(task, dateKey) });
      }

      buttons.push({ text: 'Cancelar', style: 'cancel' });

      Alert.alert(task.name, undefined, buttons);
    },
    [markTaskAsDone, onEdit, removeFromDayAndSyncTask],
  );

  const handlePressEvent = useCallback(
    (event: OnEventResponse) => {
      const { task } = event as CalendarTaskEvent;
      if (!task) return;

      const now = Date.now();
      const isDoublePress = lastPress.current.id === event.id && now - lastPress.current.ts < DOUBLE_PRESS_MS;

      if (isDoublePress) {
        clearSinglePressTimer();
        lastPress.current = { id: '', ts: 0 };
        showTaskActions(task, event.start?.dateTime);
        return;
      }

      lastPress.current = { id: event.id, ts: now };
      clearSinglePressTimer();

      singlePressTimer.current = setTimeout(() => {
        singlePressTimer.current = null;
        lastPress.current = { id: '', ts: 0 };
        setSelectedStartISO(event.start?.dateTime);
        setSelectedTask(task);
      }, DOUBLE_PRESS_MS);
    },
    [clearSinglePressTimer, showTaskActions],
  );

  const handleDragEventEnd = useCallback(
    (event: OnEventResponse) => {
      const startISO = event.start?.dateTime;
      const endISO = event.end?.dateTime;
      if (!startISO || !endISO) return;

      const { task } = event as CalendarTaskEvent;
      if (!task) return;

      const durationMin = Math.max(5, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000));
      scheduleAndSyncTask(task, new Date(startISO).toISOString(), durationMin);
    },
    [scheduleAndSyncTask],
  );

  const goToday = useCallback(() => {
    calendarRef.current?.goToDate({
      date: toLocalISOString(),
      hourScroll: true,
      animatedDate: true,
      animatedHour: true,
    });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  const ghostAccent = drag ? (getLifeArea(drag.task.goal.name)?.accent ?? '#6366f1') : '#6366f1';
  const modalTask = tasks.find((item) => item.id === selectedTask?.id) ?? selectedTask;
  const modalDurationMin = (() => {
    if (!modalTask) return 30;
    if (selectedStartISO) {
      const slot = getTaskSlot(modalTask, localDateKey(new Date(selectedStartISO)));
      if (slot) return slot.duration;
    }
    return getTaskDurationMin(modalTask);
  })();

  return (
    <View ref={screenRootRef} className="flex-1" onLayout={syncCalendarBounds}>
      <CalendarHeaderBar
        dateLabel={dateLabel}
        isDark={isDark}
        onPrev={() => calendarRef.current?.goToPrevPage()}
        onNext={() => calendarRef.current?.goToNextPage()}
        onToday={goToday}
        showSyncButton={googleSyncEnabled}
        syncPending={syncPending}
        onSync={handleGoogleSync}
      />

      <UnscheduledTray tasks={unscheduled} isDark={isDark} scrollEnabled={!drag} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />

      <View ref={calendarWrapRef} className="flex-1 overflow-hidden rounded-2xl" onLayout={syncCalendarBounds}>
        <CalendarContainer
          ref={calendarRef}
          numberOfDays={1}
          firstDay={7}
          initialDate={toLocalISOString()}
          timeZone={APP_TIME_ZONE}
          hourWidth={HOUR_WIDTH}
          theme={theme}
          locale="pt"
          initialLocales={{ pt: PT_LOCALE }}
          events={events as CalendarTaskEvent[]}
          minRegularEventMinutes={MIN_EVENT_MINUTES}
          useAllDayEvent={false}
          allowDragToEdit
          dragStep={DRAG_STEP_MIN}
          spaceFromTop={SPACE_FROM_TOP}
          spaceFromBottom={80}
          scrollToNow
          onPressEvent={handlePressEvent}
          onDragEventEnd={handleDragEventEnd}
          onLongPressBackground={handleLongPressBackground}
          onDateChanged={setVisibleDate}
        >
          <CalendarBody showNowIndicator renderEvent={renderCalendarEvent} renderHour={renderHour} />
        </CalendarContainer>
      </View>

      {drag ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View
            style={{
              position: 'absolute',
              left: drag.x - screenOrigin.current.x - GHOST_OFFSET_X,
              top: drag.y - screenOrigin.current.y - GHOST_OFFSET_Y,
              width: GHOST_WIDTH,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: ghostAccent,
              opacity: 0.92,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
              {drag.task.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{formatDuration(getTaskDurationMin(drag.task))}</Text>
          </View>
        </View>
      ) : null}

      <TaskDetailModal
        visible={!!selectedTask}
        task={modalTask}
        isDark={isDark}
        durationMin={modalDurationMin}
        onClose={closeTaskDetail}
        onToggleSubtask={toggleSubtask}
        onSaveSubtasks={saveSubtasks}
        onSaveDetails={saveTaskDetails}
        onChangeDuration={handleModalDurationChange}
        onEdit={handleModalEdit}
        onComplete={handleModalComplete}
        onRemoveFromDay={selectedStartISO ? handleModalRemoveFromDay : undefined}
        onDelete={handleModalDelete}
      />
    </View>
  );
}
