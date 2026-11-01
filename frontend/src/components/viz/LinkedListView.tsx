import { motion } from 'motion/react';
import type { LinkedListState } from '@/engine/types';
import { ROLE_META } from './roles';

const W = 70;
const H = 44;
const GAP = 46;
const TOP = 70;

export function LinkedListView({
  state,
  playful,
  still,
}: {
  state: LinkedListState;
  playful: boolean;
  still?: boolean;
}) {
  const pos = new Map(state.nodes.map((n, i) => [n.id, i]));
  const x = (i: number) => 20 + i * (W + GAP);
  const width = Math.max(320, x(state.nodes.length) + 40);
  const height = 220;
  const changed = new Set(state.changedEdges ?? []);
  const t = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 220, damping: 24 };

  const edgePath = (fromId: string, toId: string, lane: 'next' | 'prev') => {
    const a = pos.get(fromId)!;
    const b = pos.get(toId)!;
    const y = TOP + (lane === 'next' ? H / 2 - 6 : H / 2 + 8);
    if (b === a + 1 && lane === 'next') return `M${x(a) + W} ${y} L${x(b) - 4} ${y}`;
    if (b === a - 1 && lane === 'prev') return `M${x(a)} ${y} L${x(b) + W + 4} ${y}`;
    // non-adjacent: arc above for next, below for prev
    const x1 = x(a) + W / 2;
    const x2 = x(b) + W / 2;
    const lift = 30 + Math.abs(b - a) * 8;
    return lane === 'next'
      ? `M${x1} ${TOP} C${x1} ${TOP - lift}, ${x2} ${TOP - lift}, ${x2} ${TOP - 4}`
      : `M${x1} ${TOP + H} C${x1} ${TOP + H + lift}, ${x2} ${TOP + H + lift}, ${x2} ${TOP + H + 4}`;
  };

  return (
    <div className="overflow-x-auto p-2">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${state.variant} linked list: ${state.nodes.map((n) => n.value).join(', ') || 'empty'}`}
      >
        <defs>
          {['next', 'prev', 'hot'].map((k) => (
            <marker
              key={k}
              id={`arrow-${k}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M0 0 L10 5 L0 10z"
                fill={k === 'hot' ? '#f472b6' : k === 'prev' ? '#a78bfa' : '#94a3b8'}
              />
            </marker>
          ))}
        </defs>
        {state.nodes.length === 0 && (
          <text x={20} y={TOP + 26} fill="#9aa6c8" fontSize="14">
            head → null (empty list)
          </text>
        )}
        {state.nodes.map((n) => {
          const nx = state.next[n.id];
          const hot = changed.has(`${n.id}->${nx}`);
          if (nx && pos.has(nx))
            return (
              <path
                key={`n-${n.id}`}
                d={edgePath(n.id, nx, 'next')}
                stroke={hot ? '#f472b6' : '#94a3b8'}
                strokeWidth={hot ? 3 : 2}
                fill="none"
                markerEnd={`url(#arrow-${hot ? 'hot' : 'next'})`}
              />
            );
          if (nx === null) {
            const i = pos.get(n.id)!;
            return (
              <g key={`null-${n.id}`}>
                <path
                  d={`M${x(i) + W} ${TOP + H / 2 - 6} l20 0`}
                  stroke={hot ? '#f472b6' : '#475569'}
                  strokeWidth="2"
                  markerEnd="url(#arrow-next)"
                />
                <text
                  x={x(i) + W + 24}
                  y={TOP + H / 2 - 2}
                  fill="#64748b"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  ∅
                </text>
              </g>
            );
          }
          return null;
        })}
        {state.prev &&
          state.nodes.map((n) => {
            const pv = state.prev![n.id];
            if (!pv || !pos.has(pv)) return null;
            return (
              <path
                key={`p-${n.id}`}
                d={edgePath(n.id, pv, 'prev')}
                stroke="#a78bfa"
                strokeWidth={1.6}
                strokeDasharray="4 3"
                fill="none"
                markerEnd="url(#arrow-prev)"
              />
            );
          })}
        {state.nodes.map((n, i) => {
          const role = state.nodeRoles[n.id];
          const meta = role ? ROLE_META[role] : null;
          const detached = !isReachable(state, n.id);
          return (
            <motion.g
              key={n.id}
              initial={false}
              animate={{ x: x(i), y: TOP, opacity: detached ? 0.55 : 1 }}
              transition={t}
            >
              <rect
                width={W}
                height={H}
                rx={playful ? 14 : 6}
                fill={meta && role !== 'muted' ? meta.color : playful ? '#1f2a48' : '#10172b'}
                stroke={meta ? meta.color : '#45557f'}
                strokeWidth={2}
                strokeDasharray={detached ? '4 3' : undefined}
              />
              <line
                x1={W - 18}
                y1={0}
                x2={W - 18}
                y2={H}
                stroke={meta && role !== 'muted' ? '#070a14' : '#45557f'}
                strokeOpacity={0.5}
              />
              <text
                x={(W - 18) / 2}
                y={H / 2 + 5}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontWeight={700}
                fontSize={15}
                fill={meta && role !== 'muted' ? '#070a14' : '#e2e8f0'}
              >
                {n.value}
              </text>
              {meta && meta.glyph && role !== 'muted' && (
                <text x={W - 9} y={14} textAnchor="middle" fontSize={10} fill="#070a14">
                  {meta.glyph}
                </text>
              )}
              {playful && <circle cx={W - 9} cy={H - 10} r={3} fill="#070a14" opacity={0.5} />}
              <text
                x={W / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7aa3"
                fontFamily="monospace"
              >
                {n.id}
              </text>
            </motion.g>
          );
        })}
        {state.pointers.map((p, k) => {
          const i = pos.get(String(p.at));
          if (i === undefined) return null;
          const stackIdx = state.pointers.slice(0, k).filter((q) => q.at === p.at).length;
          return (
            <motion.g
              key={p.name}
              initial={false}
              animate={{ x: x(i) + W / 2, y: TOP + H + 34 + stackIdx * 16 }}
              transition={t}
            >
              <text
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={p.name === 'head' ? '#38bdf8' : p.name === 'tail' ? '#fb923c' : '#22d3ee'}
                fontFamily="monospace"
              >
                ▲ {p.name}
              </text>
            </motion.g>
          );
        })}
        {state.variant === 'circular' &&
          state.tail &&
          state.head &&
          state.next[state.tail] === state.head && (
            <text x={20} y={20} fontSize={11} fill="#a78bfa">
              circular: tail.next → head
            </text>
          )}
      </svg>
    </div>
  );
}

function isReachable(state: LinkedListState, id: string): boolean {
  let cur = state.head;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === id) return true;
    seen.add(cur);
    cur = state.next[cur];
  }
  return false;
}
