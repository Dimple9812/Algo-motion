import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/App';
import { CHALLENGES, buildChallenge } from './learnData';
import { filterBundled } from '@/api/hooks';
import { usePrefs } from '@/store/prefs';
import { useAuth } from '@/api/client';

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  usePrefs.setState({ mode: 'playful', gamification: true, motion: 'reduce' });
  useAuth.setState({ accessToken: null, user: null, restored: true });
  // Backend unreachable in unit tests → the UI must degrade to the bundled catalog.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('network'))),
  );
});

describe('navigation', () => {
  it('renders the landing page headline and calls to action', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Algorithms aren’t magic.Watch them work.',
    );
    expect(screen.getByRole('link', { name: /Explore the AlgoVerse/ })).toHaveAttribute(
      'href',
      '/visualizer',
    );
  });

  it('opens a world and switches algorithms', async () => {
    renderAt('/visualizer/sorting?algo=merge-sort');
    expect(await screen.findByRole('heading', { name: 'Merge sort' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quick sort (Lomuto)' }));
    expect(await screen.findByRole('heading', { name: 'Quick sort (Lomuto)' })).toBeInTheDocument();
  });

  it('shows input errors for invalid binary search input instead of a broken animation', async () => {
    renderAt('/visualizer/searching?algo=binary-search');
    const input = await screen.findByRole('textbox', { name: 'Array' });
    await userEvent.clear(input);
    await userEvent.type(input, '9, 3, 1');
    await userEvent.click(screen.getByRole('button', { name: 'Run with this input' }));
    expect(await screen.findByTestId('input-error')).toHaveTextContent(/sorted/);
  });

  it('protects private pages', async () => {
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in to see this page' })).toBeInTheDocument();
  });

  it('renders 404 for unknown routes', () => {
    renderAt('/nope');
    expect(screen.getByText(/index out of bounds/)).toBeInTheDocument();
  });
});

describe('problems (offline fallback)', () => {
  it('lists bundled problems with an offline banner and filters by difficulty', async () => {
    renderAt('/problems');
    expect(await screen.findByTestId('offline-banner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hard' }));
    await waitFor(() => expect(screen.getAllByText('hard').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('easy')).toHaveLength(0);
  });

  it('filterBundled paginates and searches by pattern', () => {
    const all = filterBundled({ size: 10 });
    expect(all.totalItems).toBeGreaterThanOrEqual(75);
    expect(all.items).toHaveLength(10);
    expect(filterBundled({ q: 'monotonic' }).items.length).toBeGreaterThan(0);
    expect(
      filterBundled({ topic: 'graphs', difficulty: 'HARD' }).items.every(
        (p) => p.topic === 'graphs' && p.difficulty === 'HARD',
      ),
    ).toBe(true);
  });

  it('problem page switches between brute force and optimized tabs', async () => {
    renderAt('/problems/two-sum');
    expect(await screen.findByRole('heading', { name: 'Pair That Pays' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Brute force' }));
    expect(screen.getByRole('heading', { name: 'Check every pair' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Optimized' }));
    expect(screen.getByRole('heading', { name: 'Hash map of seen values' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run tests/ })).toBeDisabled();
  });
});

describe('mini-challenges', () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))(
    '%s produces questions whose answers come from the trace',
    (_id, c) => {
      for (let seed = 1; seed <= 3; seed++) {
        const { questions, trace } = buildChallenge(c, seed);
        expect(questions.length).toBeGreaterThan(0);
        for (const q of questions) {
          expect(q.showStep).toBeLessThan(trace.steps.length);
          if (q.options !== 'number') expect(q.options.map((o) => o.id)).toContain(q.answer);
        }
      }
    },
  );

  it('validates answers and offers a retry', async () => {
    renderAt('/learn/challenges/swap-or-not');
    const prompt = await screen.findByTestId('challenge-prompt');
    expect(prompt).toHaveTextContent('Will they swap?');
    await userEvent.click(screen.getByRole('button', { name: 'Yes, swap' }));
    expect(await screen.findByTestId('challenge-feedback')).toBeInTheDocument();
  });
});
