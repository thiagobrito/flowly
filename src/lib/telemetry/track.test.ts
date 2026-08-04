import { getSessionId } from './identity';
import { enqueue } from './queue';
import { setTelemetryEnabled, track } from './track';

// Isola a fila e a identidade: aqui interessa só a validação e a sanitização.
jest.mock('./queue', () => ({ enqueue: jest.fn() }));
jest.mock('./identity', () => ({ getSessionId: () => 'session-1' }));

const enqueueMock = enqueue as jest.Mock;

describe('track', () => {
  beforeEach(() => {
    enqueueMock.mockClear();
    setTelemetryEnabled(true);
  });

  it('carimba o evento com a sessão atual', () => {
    track('app_open');

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][0]).toMatchObject({ name: 'app_open', session_id: getSessionId() });
  });

  it('ignora nomes fora da allowlist', () => {
    track('evento_inventado' as never);

    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('descarta valores que não sejam escalares e corta strings longas', () => {
    track('purchase_failed', { code: 'x'.repeat(200), status: 2, ok: true, extra: { a: 1 } as never });

    const { props } = enqueueMock.mock.calls[0][0];
    expect(props.code).toHaveLength(120);
    expect(props).toMatchObject({ status: 2, ok: true });
    expect(props).not.toHaveProperty('extra');
  });

  it('não enfileira nada quando a coleta está desligada', () => {
    setTelemetryEnabled(false);

    track('app_open');

    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
