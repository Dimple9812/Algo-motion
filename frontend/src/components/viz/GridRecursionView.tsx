import clsx from 'clsx';
import type { GridState, RecursionState } from '@/engine/types';
import { ROLE_META } from './roles';
import { layoutTree } from './TreeView';

export function GridView({ state, playful }: { state: GridState; playful: boolean }) {
  const roleOf = (r: number, c: number) => {
    let role;
    for (const h of state.highlights) if (h.r === r && h.c === c) role = h.role;
    return role;
  };
  return (
    <div className="flex flex-col gap-2 overflow-x-auto p-2">
      {state.caption && <span className="text-xs text-ink-300">{state.caption}</span>}
      <table
        className="border-separate font-mono text-sm"
        style={{ borderSpacing: playful ? 4 : 0 }}
        aria-label={state.caption ?? 'table'}
      >
        {state.colLabels && (
          <thead>
            <tr>
              {state.rowLabels && <th />}
              {state.colLabels.map((l, i) => (
                <th key={i} className="px-1 pb-1 text-xs font-medium text-ink-300">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {state.cells.map((row, r) => (
            <tr key={r}>
              {state.rowLabels && (
                <th className="pr-2 text-right text-xs font-medium text-ink-300">{state.rowLabels[r]}</th>
              )}
              {row.map((v, c) => {
                const role = roleOf(r, c);
                const meta = role ? ROLE_META[role] : null;
                const strong = meta && role !== 'muted' && role !== 'visited';
                return (
                  <td
                    key={c}
                    aria-label={`row ${r} column ${c}: ${v ?? 'empty'}${meta ? `, ${meta.label}` : ''}`}
                    className={clsx(
                      'h-10 min-w-10 text-center transition-colors',
                      playful ? 'rounded-lg' : 'border border-ink-700',
                    )}
                    style={{
                      background: strong
                        ? meta!.color
                        : role === 'visited'
                          ? '#1e293b'
                          : role === 'muted'
                            ? '#0b1020'
                            : playful
                              ? '#1a1440'
                              : '#10172b',
                      color: strong ? '#070a14' : role === 'muted' ? '#475569' : '#e2e8f0',
                      boxShadow: strong && playful ? `0 0 14px ${meta!.color}` : undefined,
                    }}
                  >
                    {v ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_STYLE: Record<string, { fill: string; text: string; label: string }> = {
  active: { fill: '#38bdf8', text: '#070a14', label: 'running' },
  waiting: { fill: '#1f2a48', text: '#e2e8f0', label: 'waiting on a child call' },
  returned: { fill: '#14532d', text: '#bbf7d0', label: 'returned' },
  base: { fill: '#a78bfa', text: '#070a14', label: 'base case' },
};

export function RecursionView({ state, playful }: { state: RecursionState; playful: boolean }) {
  const nodes = state.frames.map((f) => ({
    id: f.id,
    label: f.label,
    children: state.frames.filter((c) => c.parent === f.id).map((c) => c.id),
  }));
  const root = state.frames.find((f) => f.parent === null)?.id ?? null;
  const { pos, width, depth } = layoutTree({ nodes, root, variant: 'trie' });
  const SX = 84;
  const SY = 62;
  const w = Math.max(300, width * SX + 20);
  const h = (depth + 1) * SY + 30;
  const px = (id: string) => 10 + pos.get(id)!.x * SX + SX / 2;
  const py = (id: string) => 24 + pos.get(id)!.y * SY;
  return (
    <div className="flex flex-col gap-4 p-2 lg:flex-row">
      <div className="overflow-auto">
        {root ? (
          <svg
            width={w}
            height={h}
            role="img"
            aria-label="recursion tree"
            className={playful ? 'rounded-2xl bg-gradient-to-b from-rose-950/30 to-transparent' : ''}
          >
            {state.frames.map((f) =>
              f.parent && pos.has(f.parent) && pos.has(f.id) ? (
                <line
                  key={`e-${f.id}`}
                  x1={px(f.parent)}
                  y1={py(f.parent)}
                  x2={px(f.id)}
                  y2={py(f.id)}
                  stroke="#45557f"
                  strokeWidth={2}
                />
              ) : null,
            )}
            {state.frames.map((f) => {
              if (!pos.has(f.id)) return null;
              const s = STATUS_STYLE[f.status];
              return (
                <g
                  key={f.id}
                  transform={`translate(${px(f.id)},${py(f.id)})`}
                  aria-label={`${f.label}: ${s.label}${f.returnValue ? `, returned ${f.returnValue}` : ''}`}
                >
                  <rect
                    x={-38}
                    y={-14}
                    width={76}
                    height={28}
                    rx={playful ? 12 : 4}
                    fill={s.fill}
                    stroke={f.status === 'active' ? '#e0f2fe' : '#45557f'}
                  />
                  <text y={4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={s.text}>
                    {f.label.length > 13 ? f.label.slice(0, 12) + '…' : f.label}
                  </text>
                  {f.returnValue !== undefined && (
                    <text y={26} textAnchor="middle" fontSize={10} fill="#fde68a" fontFamily="monospace">
                      ↩ {f.returnValue}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="text-sm text-ink-300">No calls yet.</p>
        )}
      </div>
      <div className="flex min-w-[160px] flex-col gap-3">
        <div>
          <span className="text-xs text-ink-300">call stack (top first)</span>
          <ol className="mt-1 flex flex-col gap-1 font-mono text-xs">
            {[...state.stack].reverse().map((s, i) => (
              <li
                key={i}
                className={clsx('rounded px-2 py-1', i === 0 ? 'bg-sky-400 text-ink-950' : 'bg-ink-800')}
              >
                {s}
              </li>
            ))}
            {state.stack.length === 0 && <li className="text-ink-400">(empty)</li>}
          </ol>
        </div>
        {state.output && (
          <div>
            <span className="text-xs text-ink-300">{state.output.label}</span>
            <div className="mt-1 flex flex-wrap gap-1 font-mono text-xs">
              {state.output.tokens.map((t, i) => (
                <span key={i} className="rounded bg-ink-800 px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        <ul className="text-[11px] text-ink-300">
          {Object.values(STATUS_STYLE).map((s) => (
            <li key={s.label} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.fill }} /> {s.label}
            </li>
          ))}
        </ul>
      </div>
      {state.grid && <GridView state={state.grid} playful={playful} />}
    </div>
  );
}
