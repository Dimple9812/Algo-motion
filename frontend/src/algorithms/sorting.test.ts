import { describe, expect, it } from 'vitest';
import { validateTrace } from '@/engine/validate';
import { SORT_ALGORITHMS } from './sorting';
import { randomInts } from './util';

const cases: number[][] = [
  [],
  [1],
  [2, 1],
  [3, 3, 3],
  [5, 1, 4, 2, 8, 3],
  [9, 8, 7, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5],
  [4, 2, 2, 8, 3, 3, 1, 0, 0],
];
for (let s = 1; s <= 25; s++) cases.push(randomInts(s, 1 + (s % 12), 0, 20));

describe.each(SORT_ALGORITHMS.map((a) => [a.id, a] as const))('%s', (_id, algo) => {
  it.each(cases.map((c) => [JSON.stringify(c), c]))('sorts %s', (_label, values) => {
    const trace = algo.run({ values });
    const result = trace.result as { sorted: number[]; order: number[] };
    expect(result.sorted).toEqual([...values].sort((a, b) => a - b));
    // order is a permutation pointing back to the original value
    expect(result.order.map((i) => values[i])).toEqual(result.sorted);
    expect(validateTrace(trace).ok).toBe(true);
    // final snapshot matches result
    const last = trace.steps[trace.steps.length - 1].state;
    expect(last.kind === 'array' && last.values).toEqual(result.sorted);
  });

  if (algo.complexity.stable) {
    it('is stable for equal keys', () => {
      const values = [3, 1, 3, 2, 1, 3, 2];
      const { order, sorted } = algo.run({ values }).result as { sorted: number[]; order: number[] };
      for (let i = 1; i < sorted.length; i++)
        if (sorted[i] === sorted[i - 1]) expect(order[i]).toBeGreaterThan(order[i - 1]);
    });
  }
});

describe('metrics', () => {
  it('bubble sort on sorted input uses n-1 comparisons and no swaps', () => {
    const t = SORT_ALGORITHMS[0].run({ values: [1, 2, 3, 4, 5] });
    expect(t.metrics.comparisons).toBe(4);
    expect(t.metrics.swaps).toBe(0);
  });
  it('rejects negative values for counting and radix sort', () => {
    const counting = SORT_ALGORITHMS.find((a) => a.id === 'counting-sort')!;
    const radix = SORT_ALGORITHMS.find((a) => a.id === 'radix-sort')!;
    expect(() => counting.run({ values: [1, -2] })).toThrow(/0..20/);
    expect(() => radix.run({ values: [1, -2] })).toThrow(/non-negative/);
  });
});
