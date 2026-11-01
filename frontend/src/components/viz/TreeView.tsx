import { motion } from 'motion/react';
import type { TreeState } from '@/engine/types';
import { ArrayView } from './ArrayView';
import { ROLE_META } from './roles';

export interface Laid {
  id: string;
  x: number;
  y: number;
}

/** Tidy-ish layout: leaves get consecutive slots, parents sit above the centre of their children. */
export function layoutTree(state: Pick<TreeState, 'nodes' | 'root' | 'variant'>): {
  pos: Map<string, Laid>;
  width: number;
  depth: number;
} {
  const byId = new Map(state.nodes.map((n) => [n.id, n]));
  const pos = new Map<string, Laid>();
  let cursor = 0;
  let maxDepth = 0;
  const binary = state.variant !== 'trie';
  const place = (id: string, depth: number): number => {
    const n = byId.get(id);
    maxDepth = Math.max(maxDepth, depth);
    if (!n) return cursor;
    const kids = n.children;
    const real = kids.filter((k): k is string => !!k && byId.has(k));
    if (!real.length) {
      const x = cursor;
      cursor += 1;
      pos.set(id, { id, x, y: depth });
      return x;
    }
    const xs: number[] = [];
    kids.forEach((k) => {
      if (k && byId.has(k)) xs.push(place(k, depth + 1));
      else if (binary && real.length === 1) cursor += 0.5; // keep left/right side visible for a single child
    });
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    pos.set(id, { id, x, y: depth });
    return x;
  };
  if (state.root) place(state.root, 0);
  return { pos, width: Math.max(cursor, 1), depth: maxDepth };
}

const SX = 58;
const SY = 72;
const R = 20;

export function TreeView({ state, playful, still }: { state: TreeState; playful: boolean; still?: boolean }) {
  const { pos, width, depth } = layoutTree(state);
  const w = Math.max(280, width * SX + 40);
  const h = (depth + 1) * SY + 40;
  const px = (id: string) => 20 + pos.get(id)!.x * SX + SX / 2;
  const py = (id: string) => 30 + pos.get(id)!.y * SY;
  const t = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 200, damping: 24 };
  const isTrie = state.variant === 'trie';
  return (
    <div className="flex flex-col gap-4 overflow-x-auto p-2">
      {state.root === null || state.nodes.length === 0 ? (
        <p className="text-sm text-ink-300">(empty tree)</p>
      ) : (
        <svg
          width={w}
          height={h}
          role="img"
          aria-label={`${state.variant} tree with ${state.nodes.length} nodes`}
          className={playful ? 'rounded-2xl bg-gradient-to-b from-emerald-950/30 to-transparent' : ''}
        >
          {state.nodes.map((n) =>
            n.children.map((c, k) => {
              if (!c || !pos.has(c) || !pos.has(n.id)) return null;
              const role = state.nodeRoles[c];
              return (
                <g key={`${n.id}-${c}`}>
                  <motion.line
                    initial={false}
                    animate={{ x1: px(n.id), y1: py(n.id), x2: px(c), y2: py(c) }}
                    transition={t}
                    stroke={
                      role === 'path' || role === 'active' ? '#22d3ee' : playful ? '#3f6b52' : '#45557f'
                    }
                    strokeWidth={playful ? 4 : 2}
                    strokeLinecap="round"
                  />
                  {n.edgeLabels?.[k] && (
                    <text
                      x={(px(n.id) + px(c)) / 2 - 8}
                      y={(py(n.id) + py(c)) / 2}
                      fill="#fde68a"
                      fontSize={13}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {n.edgeLabels[k]}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          {state.nodes.map((n) => {
            if (!pos.has(n.id)) return null;
            const role = state.nodeRoles[n.id];
            const meta = role ? ROLE_META[role] : null;
            const fill = meta && role !== 'muted' ? meta.color : playful ? '#14532d' : '#10172b';
            return (
              <motion.g
                key={n.id}
                initial={false}
                animate={{ x: px(n.id), y: py(n.id) }}
                transition={t}
                aria-label={`node ${n.label}${meta ? `, ${meta.label}` : ''}`}
              >
                {playful && !isTrie && (
                  <ellipse cx={0} cy={R - 2} rx={R + 6} ry={6} fill="#052e16" opacity={0.6} />
                )}
                <circle
                  r={isTrie ? 15 : R}
                  fill={fill}
                  stroke={n.terminal ? '#fde68a' : meta ? meta.color : '#45557f'}
                  strokeWidth={n.terminal ? 4 : 2}
                />
                <text
                  y={5}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontWeight={700}
                  fontSize={isTrie && n.label === 'root' ? 9 : 14}
                  fill={meta && role !== 'muted' ? '#070a14' : '#e2e8f0'}
                >
                  {isTrie && n.label !== 'root' ? '' : n.label}
                </text>
                {meta?.glyph && role !== 'muted' && (
                  <text x={R - 2} y={-R + 6} fontSize={10} fill="#f8fafc">
                    {meta.glyph}
                  </text>
                )}
                {n.badge && (
                  <text y={R + 14} textAnchor="middle" fontSize={10} fill="#9aa6c8" fontFamily="monospace">
                    {n.badge}
                  </text>
                )}
                {n.terminal && (
                  <text x={-4} y={-R + 2} fontSize={10} fill="#fde68a">
                    ★
                  </text>
                )}
              </motion.g>
            );
          })}
          {state.pointers.map((p) =>
            pos.has(String(p.at)) ? (
              <motion.text
                key={p.name}
                initial={false}
                animate={{ x: px(String(p.at)) - R - 6, y: py(String(p.at)) - R - 4 }}
                transition={t}
                textAnchor="end"
                fontSize={11}
                fontWeight={700}
                fill="#22d3ee"
                fontFamily="monospace"
              >
                {p.name} ↘
              </motion.text>
            ) : null,
          )}
        </svg>
      )}
      {state.array && (
        <div>
          <span className="text-xs text-ink-300">array representation (parent of i is (i−1)/2)</span>
          <ArrayView
            state={{
              kind: 'array',
              values: state.array,
              highlights: state.arrayHighlights ?? [],
              pointers: [],
            }}
            playful={false}
            still={still}
          />
        </div>
      )}
      {state.output && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="text-xs text-ink-300">{state.output.label}:</span>
          {state.output.tokens.map((tk, i) => (
            <span key={i} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono">
              {tk}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
