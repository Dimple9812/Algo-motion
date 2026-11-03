import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBackendWake, type ServiceName } from './useBackendWake';
import { WakeBanner } from './WakeBanner';

const NEEDS: ServiceName[] = ['gateway', 'ai'];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mockWake(body: unknown, contentType = 'application/json', status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(typeof body === 'string' ? body : JSON.stringify(body), {
          status,
          headers: { 'content-type': contentType },
        }),
      ),
    ),
  );
}

describe('useBackendWake', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is waking while a needed service is still starting', async () => {
    mockWake({ services: { gateway: 'UP', ai: 'STARTING', users: 'STARTING' }, allUp: false });
    const { result } = renderHook(() => useBackendWake(NEEDS), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('waking'));
  });

  it('is ready once every needed service is up, even if others still sleep', async () => {
    mockWake({ services: { gateway: 'UP', ai: 'UP', users: 'STARTING' }, allUp: false });
    const { result } = renderHook(() => useBackendWake(NEEDS), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('ready'));
  });

  it('is unavailable where there is no wake endpoint (SPA fallback HTML or network error)', async () => {
    mockWake('<!doctype html>', 'text/html');
    const a = renderHook(() => useBackendWake(NEEDS), { wrapper });
    await waitFor(() => expect(a.result.current.state).toBe('unavailable'));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('network'))),
    );
    const b = renderHook(() => useBackendWake(NEEDS), { wrapper });
    await waitFor(() => expect(b.result.current.state).toBe('unavailable'));
  });
});

describe('WakeBanner', () => {
  it('announces progress per service', () => {
    render(
      <WakeBanner needs={['gateway', 'ai', 'execution']} services={{ gateway: 'UP', ai: 'STARTING' }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Waking up the backend… (1/3 ready)');
    expect(screen.getByText(/API gateway ready/)).toBeInTheDocument();
    expect(screen.getByText(/AI solver starting/)).toBeInTheDocument();
    expect(screen.getByText(/Code runner starting/)).toBeInTheDocument();
  });
});
