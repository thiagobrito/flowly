import { HeartPulse, Timer, TrendingUp, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { LevelScale, OptionChip, SectionHeader } from './components';
import type { FrequencyConfig, NewTaskPayload } from './data';
import { isFrequencyConfigValid, LIFE_AREAS } from './data';
import { FrequencyPicker } from './FrequencyPicker';

type NewTaskProps = {
  onCreate?: (payload: NewTaskPayload) => void;
};

export default function NewTask({ onCreate }: NewTaskProps) {
  const isDark = useColorScheme() === 'dark';

  const [name, setName] = useState('');
  const [energy, setEnergy] = useState(3);
  const [impact, setImpact] = useState(3);
  const [frequency, setFrequency] = useState<FrequencyConfig | null>(null);
  const [area, setArea] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      isFrequencyConfigValid(frequency) &&
      area !== null,
    [name, frequency, area],
  );

  let buttonBackground = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  let buttonTextColor = isDark ? '#71717a' : '#a1a1aa';

  if (canSubmit) {
    buttonBackground = isDark ? '#fafafa' : '#18181b';
    buttonTextColor = isDark ? '#18181b' : '#ffffff';
  }

  const handleCreate = () => {
    if (
      !isFrequencyConfigValid(frequency) ||
      area === null ||
      name.trim().length === 0
    ) {
      return;
    }

    onCreate?.({
      name: name.trim(),
      energy,
      impact,
      frequency,
      area,
    });
  };

  return (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Nova atividade
      </Text>
      <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Defina o essencial para começar com clareza.
      </Text>

      <ScrollView
        className="mt-5 flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Nome
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Meditar 10 minutos"
          placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
          className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-50"
        />

        <View className="mt-6">
          <SectionHeader label="Energia" Icon={Zap} accent="#22c55e" />
          <LevelScale
            value={energy}
            onChange={setEnergy}
            Icon={Zap}
            accent="#22c55e"
            isDark={isDark}
          />
        </View>

        <View className="mt-6">
          <SectionHeader label="Impacto" Icon={TrendingUp} accent="#3b82f6" />
          <LevelScale
            value={impact}
            onChange={setImpact}
            Icon={TrendingUp}
            accent="#3b82f6"
            isDark={isDark}
          />
        </View>

        <View className="mt-6">
          <SectionHeader label="Frequência" Icon={Timer} accent="#f97316" />
          <FrequencyPicker
            value={frequency}
            onChange={setFrequency}
            isDark={isDark}
            accent="#f97316"
          />
        </View>

        <View className="mt-6">
          <SectionHeader
            label="Área da vida"
            Icon={HeartPulse}
            accent="#8b5cf6"
          />
          <View className="-mx-1 flex-row flex-wrap">
            {LIFE_AREAS.map((item) => (
              <View key={item.id} className="w-1/2 p-1">
                <OptionChip
                  label={item.label}
                  Icon={item.Icon}
                  selected={area === item.id}
                  accent={item.accent}
                  isDark={isDark}
                  onPress={() => setArea(item.id)}
                  className="w-full"
                />
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleCreate}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          className="mb-2 mt-8 active:opacity-80"
        >
          <View
            className="items-center rounded-2xl py-3.5"
            style={{ backgroundColor: buttonBackground }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: buttonTextColor }}
            >
              Criar atividade
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
