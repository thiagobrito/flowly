import { configureStorage, getPersistedSnapshot, resetPersistedStateCacheForTests, resetStorageConfigForTests, writePersistedSnapshot } from './index';

describe('writePersistedSnapshot', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    resetPersistedStateCacheForTests();
    resetStorageConfigForTests();
    configureStorage({
      backend: {
        getItem: async (key) => memory.get(key) ?? null,
        setItem: async (key, value) => {
          memory.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    resetPersistedStateCacheForTests();
    resetStorageConfigForTests();
  });

  it('grava no cache síncrono e no backend', async () => {
    writePersistedSnapshot('auth_session_v1', { token: null, email: null, hasAccount: true });

    expect(getPersistedSnapshot({ token: 'x', email: null, hasAccount: false }, 'auth_session_v1')).toMatchObject({
      token: null,
      hasAccount: true,
      loaded: true,
    });

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(JSON.parse(memory.get('auth_session_v1') ?? '{}')).toMatchObject({ token: null, hasAccount: true });
  });
});
