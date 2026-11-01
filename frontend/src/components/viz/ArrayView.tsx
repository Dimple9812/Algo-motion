import clsx from 'clsx';
import { motion } from 'motion/react';
import type { ArrayState, Highlight } from '@/engine/types';
import { Mascot, type CharacterId } from '../mascot/Mascot';
import { ROLE_META, roleAt } from './roles';

interface Props {
  state: ArrayState;
  playful: boolean;
  character?: CharacterId;
  still?: boolean;
}

const GAP = 8;
/** Cells shrink for long arrays so typical inputs fit the canvas without scrolling. */
const cellSize = (n: number) => (n > 12 ? 38 : n > 9 ? 44 : 52);

function Cells({
  values,
  highlights,
  playful,
  label,
  small,
}: {
  values: ArrayState['values'];
  highlights?: Highlight[];
  playful: boolean;
  label?: string;
  small?: boolean;
}) {
  const size = small ? Math.min(40, cellSize(values.length)) : cellSize(values.length);
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-ink-300">{label}</span>}
      <ol className="flex" style={{ gap: GAP }} aria-label={label ?? 'array'}>
        {values.map((v, i) => {
          const role = roleAt(highlights, i);
          const meta = role ? ROLE_META[role] : null;
          const muted = role === 'muted';
          return (
            <li
              key={i}
              className="flex flex-col items-center gap-1"
              aria-label={`index ${i} value ${v ?? 'empty'}${meta && !muted ? `, ${meta.label}` : ''}`}
            >
              <motion.div
                layout={false}
                animate={{ y: role === 'swap' || role === 'compare' ? -6 : 0, opacity: muted ? 0.35 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className={clsx(
                  'relative flex items-center justify-center font-mono font-semibold tabular-nums',
                  playful ? 'rounded-xl shadow-[0_6px_0_rgba(0,0,0,0.35)]' : 'rounded-md border',
                  v === null && 'border-dashed',
                )}
                style={{
                  width: size,
                  height: size,
                  fontSize: String(v ?? '').length > 4 ? 12 : small ? 14 : 17,
                  background: meta && !muted ? meta.color : playful ? '#1f2a48' : '#10172b',
                  color: meta && !muted ? '#070a14' : '#e2e8f0',
                  borderColor: meta && !muted ? meta.color : '#2c3a60',
                }}
              >
                {v ?? ''}
                {meta && !muted && meta.glyph && (
                  <span
                    aria-hidden
                    className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-ink-950 text-[9px] text-white ring-1 ring-white/30"
                  >
                    {meta.glyph}
                  </span>
                )}
              </motion.div>
              <span className="font-mono text-[10px] text-ink-400">{i}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ArrayView({ state, playful, character = 'byte', still }: Props) {
  const CELL = cellSize(state.values.length);
  const width = Math.max(1, state.values.length) * (CELL + GAP);
  const focus =
    state.highlights.filter((h) => h.role !== 'muted' && h.role !== 'sorted' && h.role !== 'visited').at(-1)
      ?.index ?? state.pointers[0]?.at;
  const focusIdx = typeof focus === 'number' ? focus : null;
  return (
    <div className="flex flex-col items-start gap-6 overflow-x-auto p-2 pb-4">
      <div className="relative" style={{ width, paddingTop: playful ? 76 : 24 }}>
        {playful && focusIdx !== null && focusIdx < state.values.length && (
          <motion.div
            className="pointer-events-none absolute top-0"
            animate={{ x: focusIdx * (CELL + GAP) + CELL / 2 - 30 }}
            transition={still ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 18 }}
          >
            <Mascot
              character={character}
              size={60}
              mood="happy"
              animation={still ? 'none' : 'jump'}
              label={`${character} is standing on index ${focusIdx}`}
            />
          </motion.div>
        )}
        {state.ranges?.map((r, k) => (
          <div
            key={k}
            className="absolute flex justify-center border-x-2 border-t-2 border-cyan-400/60 text-[10px] text-cyan-300"
            style={{
              left: r.from * (CELL + GAP) - 3,
              width: (r.to - r.from + 1) * (CELL + GAP) - GAP + 6,
              top: (playful ? 76 : 24) - 14 - k * 4,
              height: 10,
            }}
          >
            <span className="-mt-4 bg-ink-900 px-1">{r.label}</span>
          </div>
        ))}
        {state.values.length === 0 ? (
          <p className="text-sm text-ink-300">(empty array)</p>
        ) : (
          <Cells values={state.values} highlights={state.highlights} playful={playful} />
        )}
        <div className="relative mt-1 h-10" aria-label="pointers">
          {state.pointers.map((p, k) => {
            const sameBefore = state.pointers.slice(0, k).filter((q) => q.at === p.at).length;
            return (
              <motion.div
                key={p.name}
                className="absolute flex flex-col items-center text-[11px] font-semibold text-cyan-300"
                animate={{ x: (p.at as number) * (CELL + GAP) + CELL / 2 - 18, y: sameBefore * 14 }}
                transition={still ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 24 }}
                style={{ width: 36 }}
              >
                <span aria-hidden>▲</span>
                <span className="-mt-1 font-mono">{p.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
      {state.aux?.map((a) => (
        <Cells
          key={a.label}
          values={a.values}
          highlights={a.highlights}
          playful={playful}
          label={a.label}
          small
        />
      ))}
    </div>
  );
}
