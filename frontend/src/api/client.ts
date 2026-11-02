import { create } from 'zustand';

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  /** true once we've attempted to restore a session from the refresh cookie */
  restored: boolean;
  set: (token: string | null, user: User | null) => void;
  markRestored: () => void;
}

/** Access token lives only in memory. The refresh token is an httpOnly cookie set by the backend. */
export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  restored: false,
  set: (accessToken, user) => set({ accessToken, user }),
  markRestored: () => set({ restored: true }),
}));

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Network failure (backend not running / unreachable). */
export class OfflineError extends Error {
  constructor() {
    super('The AlgoMotion backend is not reachable.');
    this.name = 'OfflineError';
  }
}

let refreshing: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        useAuth.getState().set(null, null);
        return false;
      }
      const body = (await res.json()) as { accessToken: string; user: User };
      useAuth.getState().set(body.accessToken, body.user);
      return true;
    } catch {
      return false;
    } finally {
      useAuth.getState().markRestored();
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown; retry?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = useAuth.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, body, credentials: 'include' });
  } catch {
    throw new OfflineError();
  }
  if (res.status === 401 && init.retry !== false && token) {
    if (await refreshSession()) return api<T>(path, { ...init, retry: false });
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new OfflineError();
  // The gateway always answers with JSON. Anything else (an HTML 404 page or SPA fallback from a
  // static host with no backend behind /api) means the API is not deployed: treat it as offline.
  if (res.status !== 204 && !(res.headers.get('content-type') ?? '').includes('json'))
    throw new OfflineError();
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let code: string | undefined;
    let details: Record<string, string> | undefined;
    try {
      const err = (await res.json()) as { message?: string; code?: string; details?: Record<string, string> };
      msg = err.message ?? msg;
      code = err.code;
      details = err.details;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, msg, code, details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
