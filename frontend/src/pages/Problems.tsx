import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/api/client';
import { useBookmarks, useProblems, useToggleBookmark, useTopics } from '@/api/hooks';
import { Badge, Button, Card, EmptyState, ErrorState, Spinner, inputClass } from '@/components/ui';
import { useProgress } from '@/store/progress';

export const difficultyTone = (d: string) =>
  (d === 'EASY' ? 'easy' : d === 'MEDIUM' ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard';
export const topicName = (t: string) => t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function Problems() {
  const [params, setParams] = useSearchParams();
  const f = {
    q: params.get('q') ?? '',
    topic: params.get('topic') ?? '',
    difficulty: params.get('difficulty') ?? '',
    page: Number(params.get('page') ?? 0),
    size: 15,
  };
  const [q, setQ] = useState(f.q);
  const problems = useProblems(f);
  const topics = useTopics();
  const user = useAuth((s) => s.user);
  const bookmarks = useBookmarks();
  const toggle = useToggleBookmark();
  const solved = new Set(
    useProgress((s) => s.events)
      .filter((e) => e.kind === 'problem')
      .map((e) => e.key.replace('problem:', '')),
  );
  const marked = new Set((bookmarks.data ?? []).map((b) => b.slug));
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-4xl font-extrabold">Coding interview problems</h1>
        <p className="mt-1 text-ink-300">
          Original problem statements with brute-force and optimized Java solutions, tests, and visualizations
          where a trace adapter exists.
        </p>
      </header>
      {problems.data?.offline && (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          data-testid="offline-banner"
        >
          Backend not reachable — showing the catalog bundled with the frontend. Code execution, bookmarks and
          the AI solver need the backend.
        </p>
      )}
      <Card className="flex flex-wrap items-end gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q });
          }}
          role="search"
        >
          <input
            aria-label="Search problems"
            placeholder="Search title or pattern…"
            className={inputClass + ' w-64'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" size="md">
            Search
          </Button>
        </form>
        <label className="flex flex-col text-xs text-ink-300">
          Topic
          <select
            aria-label="Topic"
            className={inputClass}
            value={f.topic}
            onChange={(e) => update({ topic: e.target.value })}
          >
            <option value="">All topics</option>
            {(topics.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {topicName(t.id)} ({t.count})
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col text-xs text-ink-300">
          Difficulty
          <div className="flex gap-1" role="group" aria-label="Difficulty">
            {['', 'EASY', 'MEDIUM', 'HARD'].map((d) => (
              <button
                key={d}
                aria-pressed={f.difficulty === d}
                onClick={() => update({ difficulty: d })}
                className={`h-10 rounded-lg px-3 text-sm ${f.difficulty === d ? 'bg-ink-600 text-white' : 'bg-ink-850 text-ink-300 hover:text-white'}`}
              >
                {d ? d[0] + d.slice(1).toLowerCase() : 'All'}
              </button>
            ))}
          </div>
        </div>
      </Card>
      {problems.isLoading && <Spinner label="Loading problems" />}
      {problems.error && <ErrorState message={(problems.error as Error).message} />}
      {problems.data && problems.data.items.length === 0 && (
        <EmptyState title="No problems match these filters." />
      )}
      {problems.data && problems.data.items.length > 0 && (
        <>
          <ul
            className="flex flex-col divide-y divide-ink-800 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900"
            aria-label="Problems"
          >
            {problems.data.items.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-ink-850">
                <span
                  className="w-5 text-emerald-300"
                  aria-label={solved.has(p.slug) ? 'solved' : 'not solved'}
                >
                  {solved.has(p.slug) ? '✓' : ''}
                </span>
                <Link to={`/problems/${p.slug}`} className="min-w-48 flex-1 font-medium hover:text-sky-300">
                  {p.title}
                </Link>
                <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty.toLowerCase()}</Badge>
                <Badge>{topicName(p.topic)}</Badge>
                <span className="hidden text-xs text-ink-400 md:inline">
                  {p.patterns.slice(0, 2).join(' · ')}
                </span>
                {p.visualizationSupported && <Badge tone="info">▶ visual</Badge>}
                {user && !problems.data.offline && (
                  <button
                    aria-label={marked.has(p.slug) ? `Remove bookmark for ${p.title}` : `Bookmark ${p.title}`}
                    aria-pressed={marked.has(p.slug)}
                    onClick={() => toggle.mutate({ slug: p.slug, on: !marked.has(p.slug) })}
                    className="text-lg"
                  >
                    {marked.has(p.slug) ? '★' : '☆'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
            <span className="text-ink-300">
              {problems.data.totalItems} problems · page {problems.data.page + 1} of{' '}
              {problems.data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" disabled={f.page <= 0} onClick={() => update({ page: String(f.page - 1) })}>
                ← Prev
              </Button>
              <Button
                size="sm"
                disabled={f.page + 1 >= problems.data.totalPages}
                onClick={() => update({ page: String(f.page + 1) })}
              >
                Next →
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
