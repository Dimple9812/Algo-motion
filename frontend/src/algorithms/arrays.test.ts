import { describe, expect, it } from 'vitest';
import { validateTrace } from '@/engine/validate';
import {
  ARRAY_ALGORITHMS,
  accessElement,
  deleteAt,
  insertAt,
  mergeSortedArrays,
  minMax,
  removeDuplicatesSorted,
  reverseArray,
  rotateLeft,
  rotateRight,
  secondLargest,
  sumAverage,
  updateValue,
} from './arrays';

describe('array operations', () => {
  it('every default input produces a valid trace', () => {
    for (const a of ARRAY_ALGORITHMS) expect(validateTrace(a.run(a.defaultInput)).errors).toEqual([]);
  });
  it('access / update with bounds checks', () => {
    expect(accessElement.run({ values: [7, 3, 9], index: 2 }).result).toBe(9);
    expect(accessElement.run({ values: [7, 3, 9], index: 3 }).result).toBeNull();
    expect(updateValue.run({ values: [1, 2, 3], index: 0, value: 9 }).result).toEqual([9, 2, 3]);
    expect(updateValue.run({ values: [1], index: -1, value: 9 }).result).toBeNull();
  });
  it('insert shifts elements right', () => {
    expect(insertAt.run({ values: [10, 20, 30], index: 1, value: 15 }).result).toEqual([10, 15, 20, 30]);
    expect(insertAt.run({ values: [], index: 0, value: 1 }).result).toEqual([1]);
    expect(insertAt.run({ values: [1, 2], index: 2, value: 3 }).result).toEqual([1, 2, 3]);
    expect(insertAt.run({ values: [1, 2], index: 5, value: 3 }).result).toBeNull();
    const t = insertAt.run({ values: [10, 20, 30], index: 0, value: 5 });
    expect(t.steps.filter((s) => s.operation === 'SHIFT')).toHaveLength(3);
  });
  it('delete shifts elements left', () => {
    expect(deleteAt.run({ values: [10, 20, 30], index: 0 }).result).toEqual([20, 30]);
    expect(deleteAt.run({ values: [10], index: 0 }).result).toEqual([]);
    expect(deleteAt.run({ values: [10], index: 1 }).result).toBeNull();
  });
  it('reverse, min/max, sum/average', () => {
    expect(reverseArray.run({ values: [1, 2, 3, 4] }).result).toEqual([4, 3, 2, 1]);
    expect(reverseArray.run({ values: [] }).result).toEqual([]);
    expect(minMax.run({ values: [3, -1, 7, 7] }).result).toEqual({ min: -1, max: 7 });
    expect(sumAverage.run({ values: [1, 2, 3, 4] }).result).toEqual({ sum: 10, average: 2.5 });
    expect(() => minMax.run({ values: [] })).toThrow();
  });
  it('rotations', () => {
    expect(rotateLeft.run({ values: [1, 2, 3, 4, 5], k: 2 }).result).toEqual([3, 4, 5, 1, 2]);
    expect(rotateRight.run({ values: [1, 2, 3, 4, 5], k: 2 }).result).toEqual([4, 5, 1, 2, 3]);
    expect(rotateRight.run({ values: [1, 2, 3], k: 7 }).result).toEqual([3, 1, 2]);
    expect(rotateLeft.run({ values: [], k: 3 }).result).toEqual([]);
  });
  it('merge, dedupe, second largest', () => {
    expect(mergeSortedArrays.run({ a: [1, 4, 7], b: [2, 3, 8, 9] }).result).toEqual([1, 2, 3, 4, 7, 8, 9]);
    expect(() => mergeSortedArrays.run({ a: [3, 1], b: [] })).toThrow(/sorted/);
    expect(removeDuplicatesSorted.run({ values: [1, 1, 2, 3, 3] }).result).toBe(3);
    expect(removeDuplicatesSorted.run({ values: [] }).result).toBe(0);
    expect(secondLargest.run({ values: [12, 35, 1, 10, 34, 1] }).result).toBe(34);
    expect(secondLargest.run({ values: [5, 5, 5] }).result).toBeNull();
  });
  it('rejects non-integer input', () => {
    expect(() => reverseArray.run({ values: [1.5] })).toThrow(/whole/);
  });
});
