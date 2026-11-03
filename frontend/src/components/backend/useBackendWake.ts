import { useQuery } from '@tanstack/react-query';

export type ServiceName = 'gateway' | 'catalog' | 'users' | 'ai' | 'execution' | 'visualization';
export type ServiceState = 'UP' | 'STARTING';
export interface WakeResult {
  services: Partial<Record<ServiceName, ServiceState>>;
  allUp: boolean;
}

export const SERVICE_LABELS: Record<ServiceName, string> = {
  gateway: 'API gateway',
  catalog: 'Problem catalog',
  users: 'Accounts',
  ai: 'AI solver',
  execution: 'Code runner',
  visualization: 'Trace service',
};

/** Where the wake endpoint lives. Only the hosted demo (Vercel) has it; locally it 404s and we fall back to normal behaviour. */
const WAKE_URL = '/api/wake';

export type WakeState = 'checking' | 'waking' | 'ready' | 'unavailable';

/**
 * Wakes the sleeping free-tier backend and reports progress. Polls every 5 s until the services this page needs are up,
 * then every 4 minutes so they stay awake while the page is open. Returns 'ready' immediately in environments without
 * the wake endpoint (local dev, Docker Compose), where the backend does not sleep.
 */
export function useBackendWake(needs: ServiceName[]) {
  const q = useQuery({
    queryKey: ['backend-wake'],
    queryFn: async (): Promise<WakeResult | null> => {
      try {
        const r = await fetch(WAKE_URL, { headers: { accept: 'application/json' } });
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
        return (await r.json()) as WakeResult;
      } catch {
        return null;
      }
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d === null) return false;
      return d && needs.every((n) => d.services[n] === 'UP') ? 240_000 : 5_000;
    },
    refetchIntervalInBackground: false,
    staleTime: 4_000,
  });
  const d = q.data;
  let state: WakeState;
  if (q.isPending) state = 'checking';
  else if (d === null || d === undefined) state = 'unavailable';
  else state = needs.every((n) => d.services[n] === 'UP') ? 'ready' : 'waking';
  return { state, services: d?.services ?? {}, needs };
}
