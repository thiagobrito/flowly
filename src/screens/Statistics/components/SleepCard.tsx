import { Activity, BedDouble, Brain, Moon, MoonStar, Pencil, Sunrise, X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import TimeStepper from '@/components/TimeStepper';
import { localDateKey } from '@/lib/date';
import type { UseEnergyScoreResult } from '@/lib/energy';
import { DEFAULT_BED_TIME, DEFAULT_WAKE_TIME, useSleepProfile } from '@/lib/sleepProfile';

const ACCENT = '#8b5cf6';
const IDEAL_SLEEP_HOURS = 8;

function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatMinutes(minutes: number): string {
  return formatHours(minutes / 60);
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Extrai "HH:MM" de um ISO já formatado pelo relógio local, para pré-preencher o editor. */
function clockOrDefault(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const clock = formatClock(iso);
  return /^\d{2}:\d{2}$/.test(clock) ? clock : fallback;
}

type SleepEditModalProps = {
  visible: boolean;
  isDark: boolean;
  initialWake: string;
  initialBed: string;
  onSave: (times: { wakeTime: string; bedTime: string }) => void;
  onClose: () => void;
};

/** Editor dos horários de dormir/acordar da noite exibida no card. */
function SleepEditModal({ visible, isDark, initialWake, initialBed, onSave, onClose }: SleepEditModalProps) {
  const [wakeTime, setWakeTime] = useState(initialWake);
  const [bedTime, setBedTime] = useState(initialBed);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full rounded-3xl bg-white p-5 dark:bg-zinc-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Ajustar horários</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} className="size-8 items-center justify-center rounded-full active:opacity-70">
              <X size={18} color={isDark ? '#a1a1aa' : '#71717a'} />
            </Pressable>
          </View>
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Corrija quando você dormiu e acordou nesta noite. Sua energia é recalculada na hora.</Text>

          <View className="mt-4 gap-3">
            <TimeStepper label="Dormi às" Icon={Moon} value={bedTime} onChange={setBedTime} isDark={isDark} accent={ACCENT} />
            <TimeStepper label="Acordei às" Icon={Sunrise} value={wakeTime} onChange={setWakeTime} isDark={isDark} accent={ACCENT} />
          </View>

          <Pressable onPress={() => onSave({ wakeTime, bedTime })} accessibilityRole="button" className="mt-5 items-center rounded-2xl py-3.5 active:opacity-90" style={{ backgroundColor: ACCENT }}>
            <Text className="text-base font-semibold text-white">Salvar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SleepTile({ Icon, label, value, isDark }: { Icon: ComponentType<{ size?: number; color?: string }>; label: string; value: string | null; isDark: boolean }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-xl bg-violet-500/5 px-3 py-2.5 dark:bg-white/5">
      <View className="flex-row items-center gap-1.5">
        <Icon size={15} color={isDark ? '#c4b5fd' : ACCENT} />
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</Text>
      </View>
      <Text className={`mt-1 text-base font-bold ${value ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>{value ?? 'Indisponível'}</Text>
    </View>
  );
}

export default function SleepCard({ energyInfo, isDark, selectedDay, autoOpenEdit, onAutoOpenHandled }: { energyInfo: UseEnergyScoreResult; isDark: boolean; selectedDay?: string; autoOpenEdit?: boolean; onAutoOpenHandled?: () => void }) {
  const { metrics, energy, loading, error } = energyInfo;
  const { saveNightTimes } = useSleepProfile();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!autoOpenEdit) return;
    setEditing(true);
    onAutoOpenHandled?.();
  }, [autoOpenEdit, onAutoOpenHandled]);

  const cardShadow = {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 12,
    elevation: 4,
  } as const;

  const hasSleepData = metrics != null && (metrics.sleepHours != null || metrics.bedTime != null || metrics.wakeTime != null || metrics.deepSleepMin != null || metrics.remSleepMin != null || metrics.sleepVariability != null);

  const handleSave = (times: { wakeTime: string; bedTime: string }) => {
    // Override da noite + usuais (se faltarem) numa só escrita — evita corrida
    // que apagava usualWakeTime/usualBedTime e reabria o modal no próximo boot.
    const dayKey = localDateKey(selectedDay ? new Date(selectedDay) : new Date());
    saveNightTimes(dayKey, times);
    setEditing(false);
  };

  const editModal = editing ? (
    <SleepEditModal visible isDark={isDark} initialWake={clockOrDefault(metrics?.wakeTime, DEFAULT_WAKE_TIME)} initialBed={clockOrDefault(metrics?.bedTime, DEFAULT_BED_TIME)} onSave={handleSave} onClose={() => setEditing(false)} />
  ) : null;

  const header = (
    <View className="flex-row items-center gap-2.5">
      <View className="size-9 items-center justify-center rounded-full bg-violet-500/15">
        <MoonStar size={18} color={isDark ? '#c4b5fd' : ACCENT} />
      </View>
      <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Sono</Text>
    </View>
  );

  const editButton = (
    <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Ajustar horários de sono" hitSlop={8} className="size-8 items-center justify-center rounded-full bg-violet-500/10 active:opacity-70 dark:bg-white/10">
      <Pencil size={14} color={isDark ? '#c4b5fd' : ACCENT} />
    </Pressable>
  );

  if (loading && !hasSleepData) {
    return (
      <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
        {header}
        <View className="items-center py-6">
          <ActivityIndicator color={isDark ? '#c4b5fd' : ACCENT} />
        </View>
      </View>
    );
  }

  if (!hasSleepData) {
    return (
      <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
        {header}
        <View className="items-center px-4 py-6">
          <Text className="text-center text-base font-semibold text-zinc-700 dark:text-zinc-200">Informações de sono não disponíveis</Text>
          <Text className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">Não encontramos dados de sono recentes no app de saúde do seu aparelho.</Text>
          {error != null && <Text className="mt-2 text-center text-[10px] text-red-400">{error.message}</Text>}

          <Pressable onPress={() => setEditing(true)} accessibilityRole="button" className="mt-4 rounded-full px-4 py-2 active:opacity-80" style={{ backgroundColor: ACCENT }}>
            <Text className="text-sm font-semibold text-white">Informar horários</Text>
          </Pressable>
        </View>

        {editModal}
      </View>
    );
  }

  const sleepQuality = energy?.breakdown.find((sub) => sub.key === 'sleepHours');
  const sleepPercent = metrics.sleepHours != null ? Math.max(0, Math.min(100, (metrics.sleepHours / IDEAL_SLEEP_HOURS) * 100)) : null;

  return (
    <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
      <View className="flex-row items-center justify-between">
        {header}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          {sleepQuality?.available ? (
            <View className="rounded-full bg-violet-500/15 px-3 py-1">
              <Text className="text-xs font-bold" style={{ color: isDark ? '#c4b5fd' : ACCENT }}>
                Qualidade {Math.round(sleepQuality.value)}
              </Text>
            </View>
          ) : null}
          {editButton}
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row items-end justify-between">
          <Text className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{metrics.sleepHours != null ? formatHours(metrics.sleepHours) : '—'}</Text>
          <Text className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Meta: {IDEAL_SLEEP_HOURS}h</Text>
        </View>

        {metrics.bedTime != null && metrics.wakeTime != null && (
          <Text className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {formatClock(metrics.bedTime)} – {formatClock(metrics.wakeTime)}
          </Text>
        )}

        {sleepPercent != null && (
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-violet-500/10 dark:bg-white/10">
            <View className="h-full rounded-full" style={{ width: `${sleepPercent}%`, backgroundColor: ACCENT }} />
          </View>
        )}
      </View>

      <View className="mt-4 flex-row flex-wrap" style={{ gap: 8 }}>
        <SleepTile Icon={Moon} label="Dormir" value={metrics.bedTime != null ? formatClock(metrics.bedTime) : null} isDark={isDark} />
        <SleepTile Icon={Sunrise} label="Despertar" value={metrics.wakeTime != null ? formatClock(metrics.wakeTime) : null} isDark={isDark} />
        <SleepTile Icon={BedDouble} label="Sono profundo" value={metrics.deepSleepMin != null ? formatMinutes(metrics.deepSleepMin) : null} isDark={isDark} />
        <SleepTile Icon={Brain} label="Sono REM" value={metrics.remSleepMin != null ? formatMinutes(metrics.remSleepMin) : null} isDark={isDark} />
        <SleepTile Icon={Activity} label="Regularidade" value={metrics.sleepVariability != null ? `± ${formatHours(metrics.sleepVariability)}` : null} isDark={isDark} />
      </View>

      {editModal}
    </View>
  );
}
