import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ALGORITHMS, CATEGORIES, algorithmsIn, getAlgorithm, getCategory } from '@/algorithms/registry';
import { SORT_ALGORITHMS } from '@/algorithms/sorting';
import type { AlgoInput, AlgorithmDef } from '@/algorithms/types';
import { randomInts } from '@/algorithms/util';
import { useAuth } from '@/api/client';
import { recordProgress, useSaveSession } from '@/api/hooks';
import { InputError } from '@/engine/recorder';
import { createPlayerStore, usePlaybackClock, usePlayer } from '@/engine/player';
import { CREW, Mascot } from '@/components/mascot/Mascot';
import { CATEGORY_CHARACTER } from '@/components/mascot/reactions';
import { InputForm } from '@/components/player/InputForm';
import { PlaybackControls, Player } from '@/components/player/Player';
import { Renderer } from '@/components/viz/Renderer';
import { Button, Card, useToasts } from '@/components/ui';
import { usePrefs } from '@/store/prefs';
import { useProgress } from '@/store/progress';

export function VisualizerHome() {
  const mode = usePrefs((s) => s.mode);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold">The AlgoVerse</h1>
          <p className="mt-1 text-ink-300">
            Pick a world. Every world runs real, traced algorithms — {ALGORITHMS.length} of them.
          </p>
        </div>
        {mode === 'playful' && (
          <Mascot
            character="byte"
            mood="excited"
            animation="wave"
            size={72}
            speech="Each world has its own crew member. Where to first?"
          />
        )}
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            to={`/visualizer/${c.id}`}
            className="group relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900 p-5 transition hover:-translate-y-0.5 hover:border-ink-500"
            data-testid={`world-${c.id}`}
          >
            <div
              className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full opacity-20 blur-2xl"
              style={{ background: c.accent }}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.accent }}>
                  {c.world}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">{c.name}</h2>
                <p className="mt-1 text-sm text-ink-300">{c.blurb}</p>
                <p className="mt-3 text-xs text-ink-400">
                  {algorithmsIn(c.id).length} algorithms · guide: {CREW[c.character].name}
                </p>
              </div>
              {mode === 'playful' && (
                <Mascot character={c.character} mood="happy" animation="idle" size={64} />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function runSafely(algo: AlgorithmDef, input: AlgoInput): { error: string | null; ok: boolean } {
  try {
    usePlayer.getState().load(algo.run(input));
    return { error: null, ok: true };
  } catch (e) {
    if (e instanceof InputError) return { error: e.message, ok: false };
    return {
      error: e instanceof Error ? e.message : 'Unexpected error while running the algorithm.',
      ok: false,
    };
  }
}

export function VisualizerCategory() {
  const { category = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const cat = getCategory(category);
  const algos = useMemo(() => (cat ? algorithmsIn(cat.id) : []), [cat]);
  const algo = getAlgorithm(params.get('algo') ?? '') ?? algos[0];
  const [input, setInput] = useState<AlgoInput>(algo?.defaultInput ?? {});
  const [error, setError] = useState<string | null>(null);
  const award = useProgress((s) => s.award);
  const gamification = usePrefs((s) => s.gamification);
  const user = useAuth((s) => s.user);
  const save = useSaveSession();
  const toast = useToasts((s) => s.push);
  const { trace, index } = usePlayer();
  const compare = params.get('compare') === '1' && cat?.id === 'sorting';
  const navigate = useNavigate();

  useEffect(() => {
    if (!algo) return;
    setInput(algo.defaultInput);
    const r = runSafely(algo, algo.defaultInput);
    setError(r.error);
  }, [algo]);

  // XP for watching a visualization to the end — awarded once per algorithm.
  useEffect(() => {
    if (
      !algo ||
      !trace ||
      trace.algorithm !== algo.id ||
      index !== trace.steps.length - 1 ||
      trace.steps.length < 3
    )
      return;
    const ev = award(`viz:${algo.id}`, 'visualization', algo.category);
    if (ev) {
      recordProgress(ev);
      if (gamification) toast(`+${ev.xp} XP — finished ${algo.name}`, 'success');
    }
  }, [algo, trace, index, award, gamification, toast]);

  if (!cat) return <Navigate to="/visualizer" replace />;
  if (!algo) return null;
  const character = CATEGORY_CHARACTER[cat.id];

  const submit = (next: AlgoInput) => {
    setInput(next);
    setError(runSafely(algo, next).error);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside aria-label={`${cat.name} algorithms`} className="flex flex-col gap-3">
        <Link to="/visualizer" className="text-xs text-ink-300 hover:text-white">
          ← AlgoVerse
        </Link>
        <label className="text-xs text-ink-300">
          World
          <select
            className="mt-1 h-9 w-full rounded-lg border border-ink-600 bg-ink-850 px-2 text-sm text-white"
            value={cat.id}
            onChange={(e) => navigate(`/visualizer/${e.target.value}`)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.world} — {c.name}
              </option>
            ))}
          </select>
        </label>
        <nav className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900 p-2">
          {algos.map((a) => (
            <button
              key={a.id}
              onClick={() => setParams({ algo: a.id })}
              aria-current={a.id === algo.id && !compare ? 'page' : undefined}
              className={clsx(
                'rounded-lg px-3 py-2 text-left text-sm',
                a.id === algo.id && !compare
                  ? 'bg-ink-700 font-semibold text-white'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white',
              )}
            >
              {a.name}
            </button>
          ))}
          {cat.id === 'sorting' && (
            <button
              onClick={() => setParams({ compare: '1' })}
              aria-current={compare ? 'page' : undefined}
              className={clsx(
                'mt-1 rounded-lg border border-dashed border-pink-400/40 px-3 py-2 text-left text-sm',
                compare ? 'bg-pink-400/20 text-white' : 'text-pink-200',
              )}
            >
              🏁 Compare sorts
            </button>
          )}
        </nav>
      </aside>
      {compare ? (
        <SortRace />
      ) : (
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="algo-title">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.accent }}>
                {cat.world}
              </p>
              <h1 id="algo-title" className="font-display text-3xl font-extrabold">
                {algo.name}
              </h1>
              <p className="mt-1 max-w-3xl text-ink-300">{algo.summary}</p>
            </div>
            {user && trace && (
              <Button
                size="sm"
                onClick={() =>
                  save.mutate(
                    {
                      type: 'VISUALIZATION',
                      title: `${algo.name} (${new Date().toLocaleString()})`,
                      reference: algo.id,
                      payload: { category: cat.id, algorithm: algo.id, input },
                    },
                    {
                      onSuccess: () => toast('Saved to your history', 'success'),
                      onError: (e) => toast(`Could not save: ${e.message}`, 'error'),
                    },
                  )
                }
              >
                💾 Save session
              </Button>
            )}
          </header>
          <Card>
            <InputForm algo={algo} value={input} onSubmit={submit} error={error} />
          </Card>
          {trace && trace.algorithm === algo.id && (
            <Player store={usePlayer} algo={algo} character={character} />
          )}
        </section>
      )}
    </div>
  );
}

/** Side-by-side sorting comparison on identical input, each with its own deterministic player. */
function SortRace() {
  const [values, setValues] = useState<number[]>([38, 27, 43, 3, 9, 82, 10, 55]);
  const [chosen, setChosen] = useState<string[]>([
    'bubble-sort',
    'insertion-sort',
    'merge-sort',
    'quick-sort',
  ]);
  const [tick, setTick] = useState(0);
  const playful = usePrefs((s) => s.mode) === 'playful';
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="race-h">
      <header>
        <h1 id="race-h" className="font-display text-3xl font-extrabold">
          🏁 Sorting Speedway
        </h1>
        <p className="text-ink-300">
          Every racer sorts the same input. Step counts come from the traces; they are not wall-clock
          benchmarks.
        </p>
      </header>
      <Card className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Shared input
          <input
            aria-label="Shared input"
            className="h-10 w-72 rounded-lg border border-ink-600 bg-ink-850 px-3 font-mono"
            defaultValue={values.join(', ')}
            onBlur={(e) => {
              const v = e.target.value
                .split(/[\s,]+/)
                .filter(Boolean)
                .map(Number);
              if (v.every((x) => Number.isInteger(x) && x >= 0 && x <= 999) && v.length <= 14 && v.length > 0)
                setValues(v);
            }}
          />
        </label>
        <Button size="sm" onClick={() => setValues(randomInts(Date.now() % 100000, 8, 1, 99))}>
          🎲 Random
        </Button>
        <Button size="sm" variant="primary" onClick={() => setTick((t) => t + 1)}>
          ▶ Start race
        </Button>
        <fieldset className="flex flex-wrap gap-2 text-xs">
          <legend className="sr-only">Racers</legend>
          {SORT_ALGORITHMS.map((a) => (
            <label key={a.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={chosen.includes(a.id)}
                onChange={(e) =>
                  setChosen((c) => (e.target.checked ? [...c, a.id].slice(-4) : c.filter((x) => x !== a.id)))
                }
              />
              {a.name}
            </label>
          ))}
        </fieldset>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {chosen.map((id) => (
          <Racer key={id} algo={getAlgorithm(id)!} values={values} tick={tick} playful={playful} />
        ))}
      </div>
    </section>
  );
}

function Racer({
  algo,
  values,
  tick,
  playful,
}: {
  algo: AlgorithmDef;
  values: number[];
  tick: number;
  playful: boolean;
}) {
  const store = useMemo(() => createPlayerStore(), []);
  usePlaybackClock(store);
  const { trace, index } = store();
  useEffect(() => {
    try {
      store.getState().load(algo.run({ values }));
      store.getState().setSpeed(6);
    } catch {
      /* counting/radix limits are validated in the input box */
    }
  }, [algo, values, store]);
  useEffect(() => {
    if (tick > 0) store.getState().restart();
  }, [tick, store]);
  if (!trace) return null;
  const done = index === trace.steps.length - 1;
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{algo.name}</h2>
        <span className={clsx('font-mono text-xs', done ? 'text-emerald-300' : 'text-ink-300')}>
          {done ? '✓ finished · ' : ''}
          {trace.steps.length} steps · {trace.metrics.comparisons} cmp ·{' '}
          {trace.metrics.swaps + trace.metrics.writes} moves
        </span>
      </div>
      <div className="overflow-hidden">
        <Renderer state={trace.steps[index].state} playful={playful} character="loop" still />
      </div>
      <PlaybackControls store={store} compact />
      <p className="text-xs text-ink-400">
        {algo.complexity.time.average} average · {algo.complexity.stable ? 'stable' : 'not stable'} ·{' '}
        {algo.complexity.inPlace ? 'in place' : 'extra memory'}
      </p>
    </Card>
  );
}
