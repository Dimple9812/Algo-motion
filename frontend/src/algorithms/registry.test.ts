import { describe, expect, it } from 'vitest';
import { validateTrace } from '@/engine/validate';
import { ALGORITHMS, CATEGORIES, algorithmsIn } from './registry';

describe('algorithm registry', () => {
  it('has unique ids', () => {
    expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(ALGORITHMS.length);
  });
  it('every category has at least one algorithm', () => {
    for (const c of CATEGORIES) expect(algorithmsIn(c.id).length).toBeGreaterThan(0);
  });
  it.each(ALGORITHMS.map((a) => [a.id, a] as const))(
    '%s: default input yields a valid, consistent trace',
    (_id, a) => {
      const t = a.run(a.defaultInput);
      const v = validateTrace(t);
      expect(v.errors).toEqual([]);
      expect(t.algorithm).toBe(a.id);
      expect(t.steps[0].state.kind).toBe(a.visual);
      for (const s of t.steps) if (s.line !== null) expect(s.line).toBeLessThanOrEqual(a.pseudocode.length);
      // determinism: re-running gives an identical trace
      expect(a.run(a.defaultInput)).toEqual(t);
    },
  );
  it.each(ALGORITHMS.filter((a) => a.randomInput).map((a) => [a.id, a] as const))(
    '%s: random inputs are valid',
    (_id, a) => {
      for (let s = 1; s <= 5; s++) expect(validateTrace(a.run(a.randomInput!(s))).ok).toBe(true);
    },
  );
});
