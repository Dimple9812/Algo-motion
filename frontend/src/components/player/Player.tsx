import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlgorithmDef } from '@/algorithms/types';
import { SPEEDS, usePlaybackClock, type PlayerStore } from '@/engine/player';
import type { TraceStep, VarValue } from '@/engine/types';
import { prefersReducedMotion, usePrefs } from '@/store/prefs';
import { Mascot, type CharacterId } from '../mascot/Mascot';
import { reactionForStep } from '../mascot/reactions';
import { Renderer } from '../viz/Renderer';
import { Tab, TabList, TabPanel, Tabs } from '../ui';

export function PlaybackControls({ store, compact }: { store: PlayerStore; compact?: boolean }) {
  const { trace, index, playing, speed } = store();
  const s = store.getState();
  const total = trace?.steps.length ?? 0;
  return (
    <div className="flex flex-col gap-2" aria-label="Playback controls">
      <div className="flex flex-wrap items-center gap-1.5">
        <CtlButton label="Restart" onClick={s.restart} disabled={!trace}>
          ⟲
        </CtlButton>
        <CtlButton label="Previous step" onClick={s.prev} disabled={!trace || index === 0}>
          ⏮
        </CtlButton>
        <button
          onClick={s.toggle}
          disabled={!trace}
          aria-label={playing ? 'Pause' : index > 0 && index < total - 1 ? 'Resume' : 'Play'}
          className="flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 font-semibold text-ink-950 hover:bg-sky-300 disabled:opacity-40"
        >
          {playing ? '❚❚ Pause' : index > 0 && index < total - 1 ? '▶ Resume' : '▶ Play'}
        </button>
        <CtlButton label="Next step" onClick={s.next} disabled={!trace || index >= total - 1}>
          ⏭
        </CtlButton>
        <CtlButton label="Reset to first step" onClick={s.reset} disabled={!trace}>
          ⏹
        </CtlButton>
        {!compact && (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Playback speed">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                onClick={() => s.setSpeed(sp)}
                aria-pressed={speed === sp}
                className={clsx(
                  'h-8 rounded-lg px-2 font-mono text-xs',
                  speed === sp ? 'bg-ink-600 text-white' : 'text-ink-300 hover:bg-ink-800',
                )}
              >
                {sp}×
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label="Timeline"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          onChange={(e) => s.seek(Number(e.target.value))}
          disabled={!trace}
          className="h-2 flex-1 cursor-pointer accent-sky-400"
        />
        <span className="w-24 text-right font-mono text-xs text-ink-300" aria-live="off">
          step {total ? index + 1 : 0} / {total}
        </span>
      </div>
    </div>
  );
}

function CtlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-600 bg-ink-800 text-lg hover:bg-ink-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function fmt(v: VarValue): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(', ')}]`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function PseudocodePanel({ lines, active }: { lines: string[]; active: number | null }) {
  return (
    <ol
      className="overflow-x-auto rounded-xl bg-ink-950/70 p-3 font-mono text-[13px] leading-6"
      aria-label="Pseudocode"
    >
      {lines.map((l, i) => (
        <li
          key={i}
          aria-current={active === i + 1 ? 'step' : undefined}
          className={clsx(
            'flex gap-3 whitespace-pre rounded px-1',
            active === i + 1 ? 'bg-sky-400/20 text-white ring-1 ring-sky-400/50' : 'text-ink-300',
          )}
        >
          <span className="w-5 shrink-0 text-right text-ink-500 select-none">{i + 1}</span>
          <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function VariablesPanel({ step }: { step?: TraceStep }) {
  const entries = Object.entries(step?.variables ?? {});
  if (!entries.length) return <p className="text-sm text-ink-400">No variables at this step.</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-300">{k}</dt>
          <dd className="break-all text-amber-200">{fmt(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ComplexityPanel({
  algo,
  metrics,
}: {
  algo: AlgorithmDef;
  metrics?: { comparisons: number; swaps: number; writes: number; reads: number };
}) {
  const c = algo.complexity;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <table className="w-full text-left">
        <tbody>
          <tr>
            <th className="py-0.5 pr-3 font-medium text-ink-300">Best</th>
            <td className="font-mono">{c.time.best}</td>
          </tr>
          <tr>
            <th className="py-0.5 pr-3 font-medium text-ink-300">Average</th>
            <td className="font-mono">{c.time.average}</td>
          </tr>
          <tr>
            <th className="py-0.5 pr-3 font-medium text-ink-300">Worst</th>
            <td className="font-mono">{c.time.worst}</td>
          </tr>
          <tr>
            <th className="py-0.5 pr-3 font-medium text-ink-300">Extra space</th>
            <td className="font-mono">{c.space}</td>
          </tr>
          {c.stable !== undefined && (
            <tr>
              <th className="py-0.5 pr-3 font-medium text-ink-300">Stable</th>
              <td>{c.stable ? 'yes' : 'no'}</td>
            </tr>
          )}
          {c.inPlace !== undefined && (
            <tr>
              <th className="py-0.5 pr-3 font-medium text-ink-300">In place</th>
              <td>{c.inPlace ? 'yes' : 'no'}</td>
            </tr>
          )}
        </tbody>
      </table>
      {metrics && (
        <div className="rounded-lg bg-ink-850 p-2 text-xs text-ink-300">
          <p className="mb-1 font-semibold text-slate-200">Operation counts for this input</p>
          comparisons {metrics.comparisons} · swaps {metrics.swaps} · writes {metrics.writes} · reads{' '}
          {metrics.reads}
          <p className="mt-1 text-[11px] text-ink-400">
            Counted from the trace. Animation time is not the algorithm's real runtime.
          </p>
        </div>
      )}
      {algo.assumptions?.map((a) => (
        <p
          key={a}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-100"
        >
          ⚠ {a}
        </p>
      ))}
    </div>
  );
}

export function LogPanel({
  steps,
  index,
  onSeek,
}: {
  steps: TraceStep[];
  index: number;
  onSeek: (i: number) => void;
}) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-current="step"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [index]);
  return (
    <ol ref={ref} className="max-h-64 overflow-y-auto font-mono text-xs" aria-label="Execution log">
      {steps.slice(0, index + 1).map((s) => (
        <li key={s.step}>
          <button
            onClick={() => onSeek(s.step)}
            aria-current={s.step === index ? 'step' : undefined}
            className={clsx(
              'w-full rounded px-2 py-0.5 text-left',
              s.step === index ? 'bg-ink-700 text-white' : 'text-ink-300 hover:bg-ink-800',
            )}
          >
            <span className="text-ink-500">{String(s.step + 1).padStart(3, ' ')} </span>
            <span className="text-sky-300">{s.operation.padEnd(12, ' ')}</span> {s.explanation}
          </button>
        </li>
      ))}
    </ol>
  );
}

interface PlayerProps {
  store: PlayerStore;
  algo: AlgorithmDef;
  character: CharacterId;
  showPanels?: boolean;
}

/** Full player: canvas + mascot + controls + side panels. */
export function Player({ store, algo, character, showPanels = true }: PlayerProps) {
  usePlaybackClock(store);
  const { trace, index, speed, playing } = store();
  const mode = usePrefs((s) => s.mode);
  const motionPref = usePrefs((s) => s.motion);
  const reduced = prefersReducedMotion(motionPref);
  const playful = mode === 'playful';
  const step = trace?.steps[index];
  const fast = playing && speed >= 2;
  const reaction = useMemo(
    () => reactionForStep(step, { fast, reducedMotion: reduced }),
    [step, fast, reduced],
  );
  const [tab, setTab] = useState('code');
  const containerRef = useRef<HTMLDivElement>(null);

  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const s = store.getState();
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      s.toggle();
    } else if (e.key === 'ArrowRight' || e.key === 'l') s.next();
    else if (e.key === 'ArrowLeft' || e.key === 'j') s.prev();
    else if (e.key === 'Home') s.seek(0);
    else if (e.key === 'End' && trace) s.seek(trace.steps.length - 1);
  };

  if (!trace || !step) return null;
  return (
    <div
      ref={containerRef}
      onKeyDown={onKey}
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      data-testid="player"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div
          className={clsx(
            'relative min-h-[300px] overflow-x-auto rounded-2xl border p-3',
            playful ? 'dot-grid border-ink-600 bg-ink-900/70' : 'border-ink-700 bg-ink-950',
          )}
          tabIndex={0}
          aria-label="Visualization canvas. Space plays or pauses, arrow keys step."
        >
          <Renderer state={step.state} playful={playful} character={character} still={reduced || fast} />
        </div>
        <div
          className={clsx(
            'flex items-start gap-3 rounded-2xl border border-ink-700 bg-ink-900 p-3',
            step.operation === 'ERROR' && 'border-rose-500/40',
          )}
        >
          {playful ? (
            <Mascot character={character} mood={reaction.mood} animation={reaction.animation} size={56} />
          ) : (
            <span className="mt-0.5 rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[11px] text-sky-300">
              {step.operation}
            </span>
          )}
          <p
            className="flex-1 pt-1 text-[15px] leading-relaxed"
            aria-live="polite"
            data-testid="step-explanation"
          >
            {step.explanation}
          </p>
        </div>
        <PlaybackControls store={store} />
      </div>
      {showPanels && (
        <Tabs value={tab} onChange={setTab} className="flex min-w-0 flex-col gap-2">
          <TabList label="Details">
            <Tab value="code">Pseudocode</Tab>
            <Tab value="vars">Variables</Tab>
            <Tab value="complexity">Complexity</Tab>
            <Tab value="log">Log</Tab>
          </TabList>
          <div className="rounded-2xl border border-ink-700 bg-ink-900 p-3">
            <TabPanel value="code">
              <PseudocodePanel lines={algo.pseudocode} active={step.line} />
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-ink-300">Variables</p>
                <VariablesPanel step={step} />
              </div>
            </TabPanel>
            <TabPanel value="vars">
              <VariablesPanel step={step} />
            </TabPanel>
            <TabPanel value="complexity">
              <ComplexityPanel algo={algo} metrics={trace.metrics} />
            </TabPanel>
            <TabPanel value="log">
              <LogPanel steps={trace.steps} index={index} onSeek={store.getState().seek} />
            </TabPanel>
          </div>
        </Tabs>
      )}
    </div>
  );
}
