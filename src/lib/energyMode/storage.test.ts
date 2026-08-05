import AsyncStorage from '@react-native-async-storage/async-storage';

import { localDateKey } from '@/lib/date';

import { loadEnergyModeForToday, saveEnergyModeForToday } from './storage';

const STORAGE_KEY = 'energy_mode_v1';

describe('energyMode/storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devolve ideal quando nunca houve escolha', async () => {
    await expect(loadEnergyModeForToday()).resolves.toBe('ideal');
  });

  it('faz round-trip do modo escolhido hoje', async () => {
    await saveEnergyModeForToday('rushed');

    await expect(loadEnergyModeForToday()).resolves.toBe('rushed');
  });

  // O modo é uma declaração sobre o dia de hoje ("hoje estou mal"). Herdá-lo na
  // virada do dia filtraria a lista de amanhã por um estado que já passou.
  it('ignora o modo de um dia anterior', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey: '2020-01-01', mode: 'low' }));

    await expect(loadEnergyModeForToday()).resolves.toBe('ideal');
  });

  it('ignora JSON corrompido', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{ isso não é json');

    await expect(loadEnergyModeForToday()).resolves.toBe('ideal');
  });

  it('ignora um modo desconhecido, mesmo no dia de hoje', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey: localDateKey(), mode: 'turbo' }));

    await expect(loadEnergyModeForToday()).resolves.toBe('ideal');
  });

  it('grava sob a date key de hoje', async () => {
    await saveEnergyModeForToday('low');

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual({ dateKey: localDateKey(), mode: 'low' });
  });

  it('sobrescreve a escolha anterior do mesmo dia', async () => {
    await saveEnergyModeForToday('low');
    await saveEnergyModeForToday('ideal');

    await expect(loadEnergyModeForToday()).resolves.toBe('ideal');
  });
});
