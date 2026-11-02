import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, OfflineError } from './client';

function respond(body: string, status: number, contentType: string | null) {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(status === 204 ? null : body, { status, headers }))),
  );
}

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns JSON bodies', async () => {
    respond('{"ok":1}', 200, 'application/json');
    await expect(api('/x')).resolves.toEqual({ ok: 1 });
  });

  it('maps JSON error envelopes to ApiError', async () => {
    respond('{"message":"nope","code":"NOT_FOUND"}', 404, 'application/json');
    await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('treats an HTML 404 from a static host as offline', async () => {
    respond('<!doctype html><h1>404</h1>', 404, 'text/html');
    await expect(api('/x')).rejects.toBeInstanceOf(OfflineError);
  });

  it('treats an SPA fallback page served with 200 as offline', async () => {
    respond('<!doctype html><div id="root"></div>', 200, 'text/html; charset=utf-8');
    await expect(api('/x')).rejects.toBeInstanceOf(OfflineError);
  });

  it('treats network failures and gateway 503 as offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('network'))),
    );
    await expect(api('/x')).rejects.toBeInstanceOf(OfflineError);
    respond('', 503, null);
    await expect(api('/x')).rejects.toBeInstanceOf(OfflineError);
  });

  it('accepts 204 with no content type', async () => {
    respond('', 204, null);
    await expect(api('/x')).resolves.toBeUndefined();
  });
});
