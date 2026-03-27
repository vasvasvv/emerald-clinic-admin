import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL, apiCall, apiFetch } from '../api';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds auth headers for apiCall requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiCall<{ ok: boolean }>('/api/patients', {}, 'token-123');

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/patients`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('caches repeated GET calls for the same endpoint and token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse([{ id: 1 }]));
    vi.stubGlobal('fetch', fetchMock);

    const first = await apiCall<Array<{ id: number }>>('/api/patients', {}, 'token-cache');
    const second = await apiCall<Array<{ id: number }>>('/api/patients', {}, 'token-cache');

    expect(first).toEqual([{ id: 1 }]);
    expect(second).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight GET requests', async () => {
    let resolveResponse: ((value: Response) => void) | null = null;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const firstRequest = apiCall<{ ok: boolean }>('/api/news', {}, 'token-123');
    const secondRequest = apiCall<{ ok: boolean }>('/api/news', {}, 'token-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse?.(createJsonResponse({ ok: true }));

    await expect(firstRequest).resolves.toEqual({ ok: true });
    await expect(secondRequest).resolves.toEqual({ ok: true });
  });

  it('uses error payload text for apiFetch failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ error: 'Broken request' }, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/news', {}, 'token-123')).rejects.toThrow('Broken request');
  });
});
