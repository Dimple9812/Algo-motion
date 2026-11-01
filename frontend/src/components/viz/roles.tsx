import type { Highlight, Role } from '@/engine/types';

/** Every role has a colour, a text label and a glyph so state is never communicated by colour alone. */
export const ROLE_META: Record<Role, { color: string; label: string; glyph: string }> = {
  active: { color: 'var(--role-active)', label: 'active', glyph: '●' },
  compare: { color: 'var(--role-compare)', label: 'comparing', glyph: '?' },
  swap: { color: 'var(--role-swap)', label: 'swapping', glyph: '⇄' },
  write: { color: 'var(--role-write)', label: 'written', glyph: '✎' },
  visited: { color: 'var(--role-visited)', label: 'visited', glyph: '·' },
  found: { color: 'var(--role-found)', label: 'found', glyph: '✓' },
  sorted: { color: 'var(--role-sorted)', label: 'sorted', glyph: '▪' },
  pivot: { color: 'var(--role-pivot)', label: 'pivot', glyph: 'P' },
  error: { color: 'var(--role-error)', label: 'error', glyph: '✕' },
  muted: { color: 'var(--role-muted)', label: 'out of range', glyph: '' },
  path: { color: 'var(--role-path)', label: 'on path', glyph: '→' },
  frontier: { color: 'var(--role-frontier)', label: 'frontier', glyph: '◇' },
};

/** Highest-priority role for an index (later highlights win). */
export function roleAt(highlights: Highlight[] | undefined, index: number): Role | undefined {
  if (!highlights) return undefined;
  let r: Role | undefined;
  for (const h of highlights) if (h.index === index) r = h.role;
  return r;
}

export function RoleLegend({ roles }: { roles: Role[] }) {
  const unique = [...new Set(roles)].filter((r) => r !== 'muted');
  if (!unique.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-300" aria-label="Legend">
      {unique.map((r) => (
        <li key={r} className="flex items-center gap-1">
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[9px] font-bold text-ink-950"
            style={{ background: ROLE_META[r].color }}
          >
            {ROLE_META[r].glyph}
          </span>
          {ROLE_META[r].label}
        </li>
      ))}
    </ul>
  );
}
