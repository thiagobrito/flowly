import { NativeModules } from 'react-native';

import type * as Attribution from './index';

// O pacote real derruba o app ao ser carregado sem o native (ver o cabeçalho de
// `lib/attribution`). Aqui o mock só registra o carregamento: o que o teste
// protege é justamente nunca chegar a carregá-lo nessa situação.
const mockInitializeSDK = jest.fn();
const mockSetAdvertiserTrackingEnabled = jest.fn(() => Promise.resolve(true));
const mockLoadMetaSdk = jest.fn(() => ({
  Settings: { initializeSDK: mockInitializeSDK, setAdvertiserTrackingEnabled: mockSetAdvertiserTrackingEnabled },
}));

jest.mock('react-native-fbsdk-next', () => mockLoadMetaSdk());
jest.mock('expo-tracking-transparency', () => ({ getTrackingPermissionsAsync: () => Promise.resolve({ status: 'granted' }) }));

const META_NATIVE_MODULES = ['FBSettings', 'FBAccessToken', 'FBAppEventsLogger'];

function setMetaNativeLinked(linked: boolean): void {
  const modules = NativeModules as unknown as Record<string, unknown>;
  META_NATIVE_MODULES.forEach((name) => {
    if (linked) modules[name] = {};
    else delete modules[name];
  });
}

function loadAttribution(): typeof Attribution {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require -- registry zerado a cada teste
  return require('./index');
}

describe('initAttribution', () => {
  beforeEach(() => {
    jest.resetModules();
    setMetaNativeLinked(false);
  });

  afterEach(() => {
    setMetaNativeLinked(false);
  });

  it('não carrega o SDK da Meta quando o binário não tem o módulo nativo', async () => {
    await expect(loadAttribution().initAttribution()).resolves.toBeUndefined();

    expect(mockLoadMetaSdk).not.toHaveBeenCalled();
    expect(mockInitializeSDK).not.toHaveBeenCalled();
  });

  it('inicializa o SDK refletindo o consentimento quando o native está linkado', async () => {
    setMetaNativeLinked(true);

    await loadAttribution().initAttribution();

    expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
    expect(mockSetAdvertiserTrackingEnabled).toHaveBeenCalledWith(true);
  });
});
