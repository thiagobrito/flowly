import type { CalendarKitHandle, DateOrDateTime, OnEventResponse, PackedEvent } from '@howljs/calendar-kit';
import { CalendarBody, CalendarContainer } from '@howljs/calendar-kit';
import { CircleCheckIcon, TrendingUp, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { APP_TIME_ZONE, localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { hasGoogleClientIds, useGoogleCalendarSync } from '@/lib/googleCalendar';
import { api } from '@/lib/network';
import { syncTaskReminders } from '@/lib/taskReminders';

import { useConfigPreferences } from '../Config/hooks/useConfigPreferences';
import type { ScheduledSlot, Task } from '../NewTask/data';
import { formatDuration, getLifeArea } from '../NewTask/data';
import LevelDots from '../Tasks/components/LevelDots';
import CalendarHeaderBar from './components/CalendarHeaderBar';
import TaskDetailModal from './components/TaskDetailModal';
import UnscheduledTray from './components/UnscheduledTray';
import type { CalendarTaskEvent } from './eventMapping';
import { buildCalendarEvents, getTaskDurationMin } from './eventMapping';
import { getTaskSlot, hasScheduleChanged, syncTaskScheduleToServer, syncTaskUnscheduleToServer } from './scheduleSync';
import { buildCalendarTheme } from './theme';

type CalendarProps = {
  onEdit?: (task: Task) => void;
  onCreateAt?: (dateTimeISO: string) => void;
};

const DOUBLE_PRESS_MS = 300;
const DRAG_STEP_MIN = 15;
/** Largura da coluna de horários (default `HOUR_WIDTH` do calendar-kit). */
const HOUR_WIDTH = 60;
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

  return tasks.map((task) => {
    const item = task as Task & { _id?: string };
    return {
      ...item,
      // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
      id: item.id ?? item._id ?? '',
      randomId: Math.random().toString(36).substring(2, 15),
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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleDate, setVisibleDate] = useState<string>(() => toLocalISOString());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get<any>('/tasks', { params: { date: visibleDate, energyLevel: 5 } });

      // concat with concluded tasks
      const visible = [...response.visibleTasks.map((task: Task) => ({ ...task, done: false })), ...response.concludedTasks.map((task: Task) => ({ ...task, done: true }))];
      setTasks(organizeTasks(visible));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [visibleDate]);

  const {
    isConnected,
    pending: syncPending,
    syncNow,
  } = useGoogleCalendarSync({
    onSynced: () => fetchTasks(),
    onError: () => Alert.alert('Erro na sincronização', 'Não foi possível importar os eventos do Google Calendar. Tente novamente.'),
  });

  const googleSyncEnabled = hasGoogleClientIds() && isConnected;

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  const renderCalendarEvent = useCallback(
    (event: PackedEvent) => {
      const { task } = event as unknown as CalendarTaskEvent;
      const showEnergyAndImpact = task?.estimatedMinutes && task?.estimatedMinutes >= 60;

      return (
        <View className="flex flex-1 flex-col gap-2">
          <View className="flex flex-row items-center justify-between">
            <Text className="max-w-[270px] text-gray-800" numberOfLines={2} style={{ fontSize: 12, fontWeight: '500' }}>
              {event.title}
            </Text>
            {task.done ? <CircleCheckIcon className="my-auto flex justify-end" size={22} color="white" /> : null}
          </View>

          {showEnergyAndImpact ? (
            <View className="-mt-1 flex w-[145px] flex-row items-center rounded-full bg-white/80 p-1">
              <View className="flex-row items-center" style={{ marginRight: 18 }}>
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

  const restoreTask = useCallback((snapshot: Task) => {
    setTasks((prev) => prev.map((item) => (item.id === snapshot.id ? snapshot : item)));
  }, []);

  const applyScheduleLocally = useCallback((taskId: string, slot: ScheduledSlot) => {
    setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, schedule: [slot] } : item)));
  }, []);

  const clearScheduleLocally = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== taskId) return item;
        const next: Task = { ...item, schedule: [] };
        if (item.frequency.kind === 'once') next.frequency = { kind: 'notime' };
        return next;
      }),
    );
  }, []);

  const scheduleAndSyncTask = useCallback(
    async (task: Task, startISO: string, durationMin: number) => {
      const dateKey = localDateKey(new Date(startISO));
      const previous = getTaskSlot(task, dateKey);
      if (!hasScheduleChanged(previous, startISO, durationMin)) return;

      const snapshot = task;
      applyScheduleLocally(task.id, { dateTime: startISO, duration: durationMin });

      try {
        await syncTaskScheduleToServer(task, startISO, durationMin);
        fetchTasks();
        syncTaskReminders({ enabled: remindersEnabledRef.current });
      } catch {
        restoreTask(snapshot);
      }
    },
    [applyScheduleLocally, fetchTasks, restoreTask],
  );

  const removeFromDayAndSyncTask = useCallback(
    async (task: Task, dateKey: string) => {
      const snapshot = task;
      clearScheduleLocally(task.id);

      try {
        await syncTaskUnscheduleToServer(task, dateKey);
        fetchTasks();
        syncTaskReminders({ enabled: remindersEnabledRef.current });
      } catch {
        restoreTask(snapshot);
      }
    },
    [clearScheduleLocally, fetchTasks, restoreTask],
  );

  const markTaskAsDone = useCallback(
    async (task: Task) => {
      const snapshot = task;
      setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: true } : item)));

      try {
        await api.post('/tasks/complete', { taskId: task.id, date: toLocalISOString() });
        fetchTasks();
      } catch {
        restoreTask(snapshot);
      }
    },
    [fetchTasks, restoreTask],
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
        buttons.push({ text: 'Concluir tarefa', onPress: () => markTaskAsDone(task) });
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

  const ghostAccent = drag ? (getLifeArea(drag.task.area)?.accent ?? '#6366f1') : '#6366f1';

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
          theme={theme}
          locale="pt"
          initialLocales={{ pt: PT_LOCALE }}
          events={events as CalendarTaskEvent[]}
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
          <CalendarBody showNowIndicator renderEvent={renderCalendarEvent} />
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

      <TaskDetailModal visible={!!selectedTask} task={selectedTask} isDark={isDark} onClose={() => setSelectedTask(null)} />
    </View>
  );
}
