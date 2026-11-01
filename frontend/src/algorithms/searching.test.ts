import { describe, expect, it } from 'vitest';
import { validateTrace } from '@/engine/validate';
import {
  binarySearch,
  firstOccurrence,
  lastOccurrence,
  linearSearch,
  lowerBound,
  searchRotated,
  upperBound,
} from './searching';

const lb = (a: number[], t: number) => {
  const i = a.findIndex((x) => x >= t);
  return i < 0 ? a.length : i;
};
const ub = (a: number[], t: number) => {
  const i = a.findIndex((x) => x > t);
  return i < 0 ? a.length : i;
};

describe('searching', () => {
  it('linear search finds the first match or -1', () => {
    expect(linearSearch.run({ values: [4, 8, 12, 8], target: 8 }).result).toBe(1);
    expect(linearSearch.run({ values: [4, 8], target: 5 }).result).toBe(-1);
    expect(linearSearch.run({ values: [], target: 5 }).result).toBe(-1);
  });

  it('binary search finds every element and rejects missing values', () => {
    const a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    a.forEach((x, i) => expect(binarySearch.run({ values: a, target: x }).result).toBe(i));
    for (const t of [0, 3, 100]) expect(binarySearch.run({ values: a, target: t }).result).toBe(-1);
    expect(binarySearch.run({ values: [], target: 1 }).result).toBe(-1);
  });

  it('binary search requires sorted input', () => {
    expect(() => binarySearch.run({ values: [3, 1, 2], target: 1 })).toThrow(/sorted/);
  });

  it('binary search trace shows low/high/mid pointers', () => {
    const t = binarySearch.run({ values: [1, 3, 5, 7, 9], target: 7 });
    expect(validateTrace(t).ok).toBe(true);
    const step = t.steps.find((s) => s.operation === 'COMPARE')!;
    const names = step.state.kind === 'array' ? step.state.pointers.map((p) => p.name) : [];
    expect(names).toEqual(expect.arrayContaining(['low', 'high', 'mid']));
  });

  it('bounds and occurrences match reference implementations', () => {
    const a = [1, 3, 3, 3, 5, 7, 7, 9];
    for (let t = 0; t <= 10; t++) {
      expect(lowerBound.run({ values: a, target: t }).result).toBe(lb(a, t));
      expect(upperBound.run({ values: a, target: t }).result).toBe(ub(a, t));
      expect(firstOccurrence.run({ values: a, target: t }).result).toBe(a.indexOf(t));
      expect(lastOccurrence.run({ values: a, target: t }).result).toBe(a.lastIndexOf(t));
    }
  });

  it('search in rotated array', () => {
    const a = [15, 18, 22, 30, 2, 5, 9, 12];
    a.forEach((x, i) => expect(searchRotated.run({ values: a, target: x }).result).toBe(i));
    expect(searchRotated.run({ values: a, target: 7 }).result).toBe(-1);
    expect(() => searchRotated.run({ values: [5, 1, 4, 2], target: 1 })).toThrow(/rotated/);
  });
});
