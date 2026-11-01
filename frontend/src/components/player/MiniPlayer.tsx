import { useEffect, useMemo, useState } from 'react';
import { getAlgorithm } from '@/algorithms/registry';
import type { AlgoInput } from '@/algorithms/types';
import { createPlayerStore, usePlaybackClock } from '@/engine/player';
import { prefersReducedMotion, usePrefs } from '@/store/prefs';
import { CATEGORY_CHARACTER } from '../mascot/reactions';
import { Renderer } from '../viz/Renderer';
import { PlaybackControls } from './Player';

/** Self-contained player with its own store, for embedding (landing page, problem pages). */
export function MiniPlayer({
  algorithm,
  input,
  autoPlay = false,
  label,
}: {
  algorithm: string;
  input?: AlgoInput;
  autoPlay?: boolean;
  label?: string;
}) {
  const store = useMemo(() => createPlayerStore(), []);
  usePlaybackClock(store);
  const algo = getAlgorithm(algorithm);
  const [error, setError] = useState<string | null>(null);
  const mode = usePrefs((s) => s.mode);
  const reduced = prefersReducedMotion(usePrefs((s) => s.motion));
  const key = JSON.stringify(input ?? null);
  useEffect(() => {
    if (!algo) return;
    try {
      store.getState().load(algo.run(input ?? algo.defaultInput));
      setError(null);
      if (autoPlay && !reduced) store.getState().play();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithm, key]);
  const { trace, index } = store();
  if (!algo) return <p className="text-sm text-rose-300">Unknown visualization “{algorithm}”.</p>;
  if (error) return <p className="text-sm text-rose-300">Cannot visualize this input: {error}</p>;
  const step = trace?.steps[index];
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={label ?? `${algo.name} visualization`}
      data-testid="mini-player"
    >
      <div className="min-h-[180px] overflow-hidden rounded-xl border border-ink-700 bg-ink-950/60 p-2">
        {step && (
          <Renderer
            state={step.state}
            playful={mode === 'playful'}
            character={CATEGORY_CHARACTER[algo.category]}
            still={reduced}
          />
        )}
      </div>
      <p className="min-h-12 text-sm" aria-live="polite" data-testid="step-explanation">
        {step?.explanation}
      </p>
      <PlaybackControls store={store} compact />
    </section>
  );
}
