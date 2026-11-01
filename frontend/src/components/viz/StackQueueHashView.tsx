import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import type { HashEntry, HashState, QueueState, StackState } from '@/engine/types';
import { ROLE_META, roleAt } from './roles';

function Tape({ label, tokens, cursor }: { label: string; tokens: string[]; cursor?: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-300">{label}</span>
      <div className="flex flex-wrap gap-1 font-mono text-sm">
        {tokens.length === 0 && <span className="text-ink-400">(empty)</span>}
        {tokens.map((t, i) => (
          <span
            key={i}
            className={clsx(
              'rounded px-1.5 py-0.5',
              i === cursor ? 'bg-sky-400 font-bold text-ink-950' : 'bg-ink-800 text-slate-200',
            )}
            aria-current={i === cursor ? 'true' : undefined}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Column({
  items,
  highlights,
  capacity,
  playful,
  label,
  still,
}: {
  items: (number | string)[];
  highlights: StackState['highlights'];
  capacity: number | null;
  playful: boolean;
  label: string;
  still?: boolean;
}) {
  const slots = Math.max(capacity ?? 0, items.length, 1);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={clsx(
          'relative flex w-28 flex-col-reverse gap-1.5 p-2',
          playful
            ? 'rounded-b-2xl border-x-4 border-b-4 border-amber-700/70 bg-amber-950/20'
            : 'rounded-b-md border-x-2 border-b-2 border-ink-500',
        )}
        style={{ minHeight: slots * 42 + 16 }}
        aria-label={`${label}: ${items.length ? items.join(', ') : 'empty'} (bottom to top)`}
      >
        <AnimatePresence initial={false}>
          {items.map((v, i) => {
            const role = roleAt(highlights, i);
            const meta = role ? ROLE_META[role] : null;
            return (
              <motion.div
                key={`${i}-${v}`}
                initial={still ? false : { y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={still ? { opacity: 0 } : { y: -60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={clsx(
                  'flex h-9 items-center justify-center font-mono font-bold',
                  playful ? 'rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.35)]' : 'rounded border',
                )}
                style={{
                  background: meta ? meta.color : playful ? '#f59e0b' : '#151d35',
                  color: meta || playful ? '#070a14' : '#e2e8f0',
                  borderColor: '#45557f',
                }}
              >
                {v}
                {i === items.length - 1 && (
                  <span className="ml-2 text-[10px] font-semibold opacity-70">← top</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <span className="text-xs text-ink-300">
        {label}
        {capacity !== null ? ` · ${items.length}/${capacity}` : ` · size ${items.length}`}
      </span>
    </div>
  );
}

export function StackView({
  state,
  playful,
  still,
}: {
  state: StackState;
  playful: boolean;
  still?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-8 p-2">
      <Column
        items={state.items}
        highlights={state.highlights}
        capacity={state.capacity}
        playful={playful}
        label="stack"
        still={still}
      />
      {state.side && (
        <Column
          items={state.side.items}
          highlights={[]}
          capacity={null}
          playful={playful}
          label={state.side.label}
          still={still}
        />
      )}
      <div className="flex min-w-[220px] flex-1 flex-col gap-4">
        {state.tape && (
          <Tape label={state.tape.label} tokens={state.tape.tokens} cursor={state.tape.cursor} />
        )}
        {state.output && <Tape label={state.output.label} tokens={state.output.tokens} />}
      </div>
    </div>
  );
}

export function QueueView({ state, playful }: { state: QueueState; playful: boolean }) {
  const ring = state.variant === 'circular' || state.variant === 'deque';
  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex items-center gap-2 text-xs text-ink-300">
        <span>
          {state.variant} · size {state.size}/{state.capacity}
        </span>
        {ring && (
          <span className="rounded bg-ink-800 px-1.5 py-0.5">
            indices wrap with (i + 1) mod {state.capacity}
          </span>
        )}
      </div>
      <div
        className={clsx(
          'relative flex gap-2 overflow-x-auto p-3',
          playful
            ? 'rounded-2xl border-y-4 border-dashed border-yellow-600/50 bg-yellow-950/10'
            : 'rounded-md border border-ink-600',
        )}
      >
        {state.slots.map((v, i) => {
          const role = roleAt(state.highlights, i);
          const meta = role ? ROLE_META[role] : null;
          const isFront = state.size > 0 && i === state.front;
          const isRear = state.size > 0 && i === state.rear;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="h-4 text-[10px] font-bold text-sky-300">{isFront ? 'front' : ''}</span>
              <motion.div
                layout
                className={clsx(
                  'flex h-12 w-12 items-center justify-center font-mono font-bold',
                  playful ? 'rounded-xl' : 'rounded border',
                  v === null && 'border-dashed opacity-50',
                )}
                style={{
                  background: meta
                    ? meta.color
                    : v !== null
                      ? playful
                        ? '#facc15'
                        : '#151d35'
                      : 'transparent',
                  color: meta || (playful && v !== null) ? '#070a14' : '#e2e8f0',
                  borderColor: '#45557f',
                  borderWidth: v === null ? 2 : undefined,
                }}
                aria-label={`slot ${i}: ${v ?? 'empty'}${isFront ? ', front' : ''}${isRear ? ', rear' : ''}`}
              >
                {v ?? ''}
              </motion.div>
              <span className="font-mono text-[10px] text-ink-400">{i}</span>
              <span className="h-4 text-[10px] font-bold text-orange-300">{isRear ? 'rear' : ''}</span>
            </div>
          );
        })}
        {playful && (
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-2xl" aria-hidden>
            🚂
          </span>
        )}
      </div>
    </div>
  );
}

function EntryChip({ e, active }: { e: HashEntry; active: boolean }) {
  return (
    <span
      className={clsx(
        'whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-xs',
        active ? 'bg-sky-400 text-ink-950' : 'bg-ink-700 text-slate-100',
      )}
    >
      {e.key}:{e.value}
    </span>
  );
}

export function HashView({ state, playful }: { state: HashState; playful: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex flex-wrap gap-3 text-xs text-ink-300">
        <span>strategy: {state.strategy}</span>
        <span>size: {state.size}</span>
        <span>buckets: {state.buckets.length}</span>
        <span>load factor: {state.loadFactor}</span>
        <span>collisions: {state.collisions}</span>
      </div>
      {state.hashCalc && (
        <code className="rounded bg-ink-800 px-2 py-1 text-xs text-cyan-200">{state.hashCalc}</code>
      )}
      <ol className="flex flex-col gap-1.5">
        {state.buckets.map((b, i) => {
          const role = state.bucketRoles[i];
          const meta = role ? ROLE_META[role] : null;
          return (
            <li
              key={i}
              className="flex items-center gap-2"
              aria-label={`bucket ${i}${meta ? `, ${meta.label}` : ''}`}
            >
              <span
                className={clsx(
                  'w-8 rounded py-1 text-center font-mono text-xs',
                  playful ? 'bg-emerald-900/40' : 'bg-ink-800',
                )}
                style={meta ? { background: meta.color, color: '#070a14' } : undefined}
              >
                {i}
              </span>
              <div className="flex min-h-7 flex-1 flex-wrap items-center gap-1 rounded border border-ink-700 px-2 py-1">
                {b === null && <span className="text-xs text-ink-500">empty</span>}
                {b === 'TOMBSTONE' && <span className="text-xs text-rose-300">⚰ tombstone</span>}
                {Array.isArray(b) && b.length === 0 && <span className="text-xs text-ink-500">∅</span>}
                {Array.isArray(b) &&
                  b.map((e, k) => (
                    <span key={e.key} className="flex items-center gap-1">
                      {k > 0 && <span className="text-ink-400">→</span>}
                      <EntryChip e={e} active={e.key === state.activeKey} />
                    </span>
                  ))}
                {b && !Array.isArray(b) && b !== 'TOMBSTONE' && (
                  <EntryChip e={b} active={b.key === state.activeKey} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
