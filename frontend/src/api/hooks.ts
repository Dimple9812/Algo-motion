import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import bundled from '@content/problems.json';
import { ApiError, OfflineError, api, useAuth, type User } from './client';
import type {
  Execution,
  Page,
  ProblemDetail,
  ProblemSummary,
  SavedSession,
  SolutionSession,
  TestCase,
  Topic,
} from './types';
import type { XpEvent } from '@/store/progress';

const BUNDLED = bundled as unknown as ProblemDetail[];

export interface ProblemFilters {
  q?: string;
  topic?: string;
  difficulty?: string;
  page?: number;
  size?: number;
}

const summary = (p: ProblemDetail): ProblemSummary => ({
  slug: p.slug,
  title: p.title,
  topic: p.topic,
  difficulty: p.difficulty,
  patterns: p.patterns,
  visualizationSupported: p.visualizationSupported,
});

/** Same filtering contract as the backend, used only when the backend is unreachable. */
export function filterBundled(f: ProblemFilters): Page<ProblemSummary> {
  const q = f.q?.trim().toLowerCase();
  const order = { EASY: 0, MEDIUM: 1, HARD: 2 };
  const items = BUNDLED.filter(
    (p) =>
      (!f.topic || p.topic === f.topic) &&
      (!f.difficulty || p.difficulty === f.difficulty) &&
      (!q || p.title.toLowerCase().includes(q) || p.patterns.some((x) => x.toLowerCase().includes(q))),
  )
    .sort(
      (a, b) =>
        a.topic.localeCompare(b.topic) ||
        order[a.difficulty] - order[b.difficulty] ||
        a.title.localeCompare(b.title),
    )
    .map(summary);
  const size = f.size ?? 20;
  const page = f.page ?? 0;
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
}

export function bundledProblem(slug: string): ProblemDetail | undefined {
  return BUNDLED.find((p) => p.slug === slug);
}

export const BUNDLED_PROBLEM_COUNT = BUNDLED.length;

export function bundledTopics(): Topic[] {
  const counts = new Map<string, number>();
  BUNDLED.forEach((p) => counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1));
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: id.replace(/-/g, ' '), count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type WithSource<T> = T & { offline: boolean };

export function useProblems(f: ProblemFilters) {
  return useQuery({
    queryKey: ['problems', f],
    queryFn: async (): Promise<WithSource<Page<ProblemSummary>>> => {
      const qs = new URLSearchParams(
        Object.entries(f)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      );
      try {
        return { ...(await api<Page<ProblemSummary>>(`/problems?${qs}`)), offline: false };
      } catch (e) {
        if (e instanceof OfflineError) return { ...filterBundled(f), offline: true };
        throw e;
      }
    },
    placeholderData: (prev) => prev,
  });
}

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async (): Promise<Topic[]> => {
      try {
        return await api<Topic[]>('/problems/topics');
      } catch (e) {
        if (e instanceof OfflineError) return bundledTopics();
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useProblem(slug: string) {
  return useQuery({
    queryKey: ['problem', slug],
    queryFn: async (): Promise<WithSource<ProblemDetail>> => {
      try {
        return { ...(await api<ProblemDetail>(`/problems/${encodeURIComponent(slug)}`)), offline: false };
      } catch (e) {
        if (e instanceof OfflineError) {
          const p = bundledProblem(slug);
          if (p) return { ...p, offline: true };
          throw new ApiError(404, 'Problem not found');
        }
        throw e;
      }
    },
  });
}

// ---------------------------------------------------------------- code execution

export function useSubmitExecution() {
  return useMutation({
    mutationFn: (body: { sourceCode: string; problemSlug?: string; tests?: TestCase[] }) =>
      api<Execution>('/executions', { method: 'POST', json: { language: 'java', ...body } }),
  });
}

export function useExecution(id: string | null) {
  return useQuery({
    queryKey: ['execution', id],
    enabled: !!id,
    queryFn: () => api<Execution>(`/executions/${id}`),
    refetchInterval: (q) =>
      q.state.data && ['QUEUED', 'RUNNING'].includes(q.state.data.status) ? 800 : false,
  });
}

// ---------------------------------------------------------------- AI solver

export function useCreateSolution() {
  return useMutation({
    mutationFn: (problemText: string) =>
      api<SolutionSession>('/solutions', { method: 'POST', json: { problemText } }),
  });
}

export function useSolution(id: string | undefined) {
  return useQuery({
    queryKey: ['solution', id],
    enabled: !!id,
    queryFn: () => api<SolutionSession>(`/solutions/${id}`),
    refetchInterval: (q) =>
      q.state.data && !['COMPLETED', 'FAILED'].includes(q.state.data.status) ? 1200 : false,
  });
}

export function useExtractText() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api<{ text: string; method: string; warnings: string[] }>('/solutions/extract', {
        method: 'POST',
        body: fd,
      });
    },
  });
}

// ---------------------------------------------------------------- auth & user data

interface AuthResponse {
  accessToken: string;
  user: User;
}

export function useLogin() {
  return useMutation({
    mutationFn: (b: { email: string; password: string }) =>
      api<AuthResponse>('/auth/login', { method: 'POST', json: b }),
    onSuccess: (r) => useAuth.getState().set(r.accessToken, r.user),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (b: { email: string; password: string; displayName: string }) =>
      api<AuthResponse>('/auth/register', { method: 'POST', json: b }),
    onSuccess: (r) => useAuth.getState().set(r.accessToken, r.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      useAuth.getState().set(null, null);
      qc.removeQueries({ queryKey: ['me'] });
    },
  });
}

const authed = () => !!useAuth.getState().accessToken;

export function useBookmarks() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({
    queryKey: ['me', 'bookmarks', token],
    enabled: !!token,
    queryFn: () => api<ProblemSummary[]>('/users/me/bookmarks'),
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, on }: { slug: string; on: boolean }) =>
      on
        ? api<void>('/users/me/bookmarks', { method: 'POST', json: { problemSlug: slug } })
        : api<void>(`/users/me/bookmarks/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'bookmarks'] }),
  });
}

export function useServerProgress() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({
    queryKey: ['me', 'progress', token],
    enabled: !!token,
    queryFn: () => api<{ events: XpEvent[]; totalXp: number }>('/users/me/progress'),
  });
}

export function recordProgress(ev: XpEvent): void {
  if (!authed()) return;
  void api('/users/me/progress/events', {
    method: 'POST',
    json: { key: ev.key, kind: ev.kind.toUpperCase(), topic: ev.topic },
  }).catch(() => undefined);
}

export function useHistory() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({
    queryKey: ['me', 'history', token],
    enabled: !!token,
    queryFn: () => api<SavedSession[]>('/users/me/history'),
  });
}

export function useSaveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: {
      type: SavedSession['type'];
      title: string;
      reference: string;
      payload: Record<string, unknown>;
    }) => api<SavedSession>('/users/me/sessions', { method: 'POST', json: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'history'] }),
  });
}

export function useAchievements() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({
    queryKey: ['me', 'achievements', token],
    enabled: !!token,
    queryFn: () => api<{ badgeId: string; unlockedAt: string }[]>('/users/me/achievements'),
  });
}

export function usePreferencesSync() {
  return useMutation({
    mutationFn: (b: { mode: string; gamification: boolean; motion: string }) =>
      api<void>('/users/me/preferences', { method: 'PUT', json: b }),
  });
}

export function useBackendStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      try {
        return await api<{
          status: string;
          services: Record<string, string>;
          aiProvider: string;
          executionSandbox: string;
        }>('/status');
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
    // Hosted demos may sleep when idle: keep checking while the backend looks offline so the UI recovers on its own.
    refetchInterval: (q) => (q.state.data === null ? 10_000 : false),
  });
}
