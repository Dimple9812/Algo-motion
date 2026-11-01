import { motion } from 'motion/react';
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { GraphState } from '@/engine/types';
import { ROLE_META } from './roles';

const VW = 560;
const VH = 400;
const R = 20;

/** Graph renderer. Vertices can be dragged; positions are view-only and never touch the trace. */
export function GraphView({
  state,
  playful,
  still,
}: {
  state: GraphState;
  playful: boolean;
  still?: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const dragging = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const p = (id: string) => {
    const n = state.nodes.find((x) => x.id === id)!;
    const o = overrides[id];
    return { x: o?.x ?? (n.x / 100) * (VW - 80) + 40, y: o?.y ?? (n.y / 100) * (VH - 80) + 40 };
  };
  const toSvg = (e: RPointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH };
  };
  const t = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 200, damping: 22 };
  // detect antiparallel edges so they can curve apart
  const keyOf = (a: string, b: string) => `${a}|${b}`;
  const edgeSet = new Set(state.edges.map((e) => keyOf(e.from, e.to)));

  return (
    <div className="flex flex-col gap-3 p-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className={`w-full max-w-[640px] touch-none select-none ${playful ? 'rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(129,140,248,0.18),transparent_60%)]' : ''}`}
        role="img"
        aria-label={`${state.directed ? 'Directed' : 'Undirected'} graph with ${state.nodes.length} vertices and ${state.edges.length} edges`}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const pt = toSvg(e);
          setOverrides((o) => ({
            ...o,
            [dragging.current!]: {
              x: Math.max(R, Math.min(VW - R, pt.x)),
              y: Math.max(R, Math.min(VH - R, pt.y)),
            },
          }));
        }}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        <defs>
          {Object.entries({ base: '#64748b', hot: '#22d3ee', err: '#f87171' }).map(([k, c]) => (
            <marker
              key={k}
              id={`g-arrow-${k}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10z" fill={c} />
            </marker>
          ))}
        </defs>
        {playful &&
          Array.from({ length: 24 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 97) % VW}
              cy={(i * 53) % VH}
              r={i % 3 === 0 ? 1.4 : 0.8}
              fill="#c7d2fe"
              opacity={0.5}
            />
          ))}
        {state.edges.map((e) => {
          const a = p(e.from);
          const b = p(e.to);
          const role = state.edgeRoles[e.id];
          const meta = role ? ROLE_META[role] : null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const curve = state.directed && edgeSet.has(keyOf(e.to, e.from)) ? 22 : 0;
          const mx = (a.x + b.x) / 2 - (dy / len) * curve;
          const my = (a.y + b.y) / 2 + (dx / len) * curve;
          const ex = b.x - (dx / len) * (R + 3);
          const ey = b.y - (dy / len) * (R + 3);
          const color = meta ? meta.color : '#475569';
          const marker = state.directed
            ? `url(#g-arrow-${role === 'error' ? 'err' : role ? 'hot' : 'base'})`
            : undefined;
          return (
            <g
              key={e.id}
              aria-label={`edge ${e.from} to ${e.to}${e.weight !== undefined ? ` weight ${e.weight}` : ''}${meta ? `, ${meta.label}` : ''}`}
            >
              <path
                d={`M${a.x} ${a.y} Q${mx} ${my} ${ex} ${ey}`}
                stroke={color}
                strokeWidth={role && role !== 'muted' ? 4 : 2}
                strokeDasharray={role === 'muted' ? '5 5' : role === 'compare' ? '8 4' : undefined}
                fill="none"
                markerEnd={marker}
                opacity={role === 'muted' ? 0.4 : 1}
              />
              {e.weight !== undefined && (
                <g>
                  <rect x={mx - 13} y={my - 10} width={26} height={18} rx={5} fill="#0b1020" stroke={color} />
                  <text
                    x={mx}
                    y={my + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="monospace"
                    fill="#e2e8f0"
                  >
                    {e.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {state.nodes.map((n) => {
          const role = state.nodeRoles[n.id];
          const meta = role ? ROLE_META[role] : null;
          const { x, y } = p(n.id);
          const fill = meta && role !== 'muted' ? meta.color : playful ? '#312e81' : '#10172b';
          return (
            <motion.g
              key={n.id}
              initial={false}
              animate={{ x, y }}
              transition={dragging.current === n.id ? { duration: 0 } : t}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                dragging.current = n.id;
              }}
              style={{ cursor: 'grab' }}
              aria-label={`vertex ${n.label}${meta ? `, ${meta.label}` : ''}${state.nodeLabels[n.id] ? `, ${state.nodeLabels[n.id]}` : ''}`}
            >
              {playful && <circle r={R + 6} fill={fill} opacity={0.18} />}
              <circle
                r={R}
                fill={fill}
                stroke={meta ? meta.color : '#6b7aa3'}
                strokeWidth={2}
                opacity={role === 'muted' ? 0.45 : 1}
              />
              {playful && <ellipse rx={R + 8} ry={5} fill="none" stroke="#c7d2fe" strokeOpacity={0.35} />}
              <text
                y={5}
                textAnchor="middle"
                fontWeight={700}
                fontSize={14}
                fill={meta && role !== 'muted' ? '#070a14' : '#e2e8f0'}
              >
                {n.label}
              </text>
              {state.nodeLabels[n.id] && (
                <text y={R + 15} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#fde68a">
                  {state.nodeLabels[n.id]}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
      <p className="text-[11px] text-ink-400">
        Tip: drag vertices to rearrange the layout. Dragging never changes the algorithm.
      </p>
      <div className="flex flex-wrap gap-6 text-sm">
        {state.frontier && (
          <div>
            <span className="text-xs text-ink-300">{state.frontier.label}: </span>
            <span className="font-mono">[{state.frontier.items.join(', ')}]</span>
          </div>
        )}
        {state.output && (
          <div>
            <span className="text-xs text-ink-300">{state.output.label}: </span>
            <span className="font-mono">{state.output.tokens.join(' → ') || '—'}</span>
          </div>
        )}
      </div>
      {state.matrix && (
        <table className="w-max border-collapse font-mono text-xs" aria-label="distance / adjacency matrix">
          <thead>
            <tr>
              <th className="p-1" />
              {state.matrix.labels.map((l) => (
                <th key={l} className="p-1 text-ink-300">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.matrix.cells.map((row, i) => (
              <tr key={i}>
                <th className="p-1 text-ink-300">{state.matrix!.labels[i]}</th>
                {row.map((c, j) => {
                  const active = state.matrix!.active?.[0] === i && state.matrix!.active?.[1] === j;
                  return (
                    <td
                      key={j}
                      className={`min-w-9 border border-ink-700 p-1 text-center ${active ? 'bg-violet-400 font-bold text-ink-950' : ''}`}
                    >
                      {c === null ? '∞' : c}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
