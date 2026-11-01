import { InputError, TraceRecorder } from '@/engine/recorder';
import type { ArrayState, Highlight, Pointer } from '@/engine/types';
import type { AlgorithmDef } from './types';
import { num, nums, randomInts, sortedRandomInts } from './util';

export function arr(
  values: (number | string | null)[],
  highlights: Highlight[] = [],
  pointers: Pointer[] = [],
  extra: Partial<ArrayState> = {},
): ArrayState {
  return { kind: 'array', values: [...values], highlights, pointers, ...extra };
}

const ARRAY_IN = { key: 'values', label: 'Array', type: 'numbers' as const };
const O1 = { best: 'O(1)', average: 'O(1)', worst: 'O(1)' };
const ON = { best: 'O(n)', average: 'O(n)', worst: 'O(n)' };

export const accessElement: AlgorithmDef = {
  id: 'array-access',
  name: 'Access element',
  category: 'arrays',
  visual: 'array',
  summary: 'Read the value stored at an index in constant time using address arithmetic.',
  pseudocode: ['if index < 0 or index >= n: error', 'return a[index]'],
  complexity: { time: O1, space: 'O(1)' },
  inputs: [ARRAY_IN, { key: 'index', label: 'Index', type: 'number' }],
  defaultInput: { values: [7, 3, 9, 4, 1], index: 2 },
  run(input) {
    const a = nums(input, 'values');
    const i = num(input, 'index');
    const rec = new TraceRecorder<ArrayState>('array-access', { values: a, index: i });
    rec.snap('INIT', `Array of length ${a.length}. Access index ${i}.`, arr(a), {
      line: 1,
      vars: { index: i, n: a.length },
    });
    if (i < 0 || i >= a.length) {
      rec.snap('ERROR', `Index ${i} is out of bounds for length ${a.length}.`, arr(a), {
        line: 1,
        vars: { index: i },
      });
      return rec.finish(null, 'Out of bounds — no value returned.', arr(a));
    }
    rec.snap(
      'READ',
      `a[${i}] = ${a[i]}. Arrays compute the address directly, so this is O(1).`,
      arr(a, [{ index: i, role: 'found' }], [{ name: 'i', at: i }]),
      { line: 2, vars: { index: i, value: a[i] } },
    );
    return rec.finish(a[i], `Returned ${a[i]}.`, arr(a, [{ index: i, role: 'found' }]), 2);
  },
};

export const insertAt: AlgorithmDef = {
  id: 'array-insert',
  name: 'Insert at index',
  category: 'arrays',
  visual: 'array',
  summary: 'Shift elements one slot to the right to open a gap, then write the new value.',
  pseudocode: [
    'if index < 0 or index > n: error',
    'grow array by one slot',
    'for i from n down to index + 1:',
    '    a[i] = a[i - 1]',
    'a[index] = value',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1) extra' },
  inputs: [
    ARRAY_IN,
    { key: 'index', label: 'Index', type: 'number' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  defaultInput: { values: [10, 20, 30, 40], index: 1, value: 15 },
  randomInput: (seed) => ({ values: randomInts(seed, 6), index: seed % 6, value: 50 }),
  run(input) {
    const a: (number | null)[] = nums(input, 'values');
    const idx = num(input, 'index');
    const value = num(input, 'value', { min: -9999, max: 9999 });
    const rec = new TraceRecorder<ArrayState>('array-insert', { values: [...a], index: idx, value });
    const n = a.length;
    rec.snap('INIT', `Insert ${value} at index ${idx}.`, arr(a), { line: 1, vars: { index: idx, value, n } });
    if (idx < 0 || idx > n) {
      rec.snap('ERROR', `Index ${idx} is outside 0..${n}.`, arr(a), { line: 1 });
      return rec.finish(null, 'Insertion rejected.', arr(a));
    }
    if (n >= 24) throw new InputError('Array is full (max 24 elements in the visualizer).');
    a.push(null);
    rec.snap(
      'INSERT',
      'Grow the array by one empty slot at the end.',
      arr(a, [{ index: n, role: 'active' }]),
      { line: 2, vars: { n: n + 1 } },
    );
    for (let i = n; i > idx; i--) {
      a[i] = a[i - 1];
      rec.snap(
        'SHIFT',
        `Shift a[${i - 1}] = ${a[i]} right to index ${i}.`,
        arr(
          a,
          [
            { index: i, role: 'write' },
            { index: i - 1, role: 'active' },
          ],
          [{ name: 'i', at: i }],
        ),
        { line: 4, vars: { i } },
      );
    }
    a[idx] = value;
    rec.snap(
      'WRITE',
      `Write ${value} into the gap at index ${idx}.`,
      arr(a, [{ index: idx, role: 'found' }]),
      { line: 5, vars: { index: idx, value } },
    );
    return rec.finish(
      a as number[],
      `Inserted. ${n - idx} element(s) were shifted.`,
      arr(a, [{ index: idx, role: 'found' }]),
    );
  },
};

export const deleteAt: AlgorithmDef = {
  id: 'array-delete',
  name: 'Delete at index',
  category: 'arrays',
  visual: 'array',
  summary: 'Remove an element by shifting everything after it one slot to the left.',
  pseudocode: [
    'if index < 0 or index >= n: error',
    'for i from index to n - 2:',
    '    a[i] = a[i + 1]',
    'shrink array by one slot',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  inputs: [ARRAY_IN, { key: 'index', label: 'Index', type: 'number' }],
  defaultInput: { values: [10, 20, 30, 40, 50], index: 1 },
  run(input) {
    const a: (number | null)[] = nums(input, 'values');
    const idx = num(input, 'index');
    const rec = new TraceRecorder<ArrayState>('array-delete', { values: [...a], index: idx });
    rec.snap(
      'INIT',
      `Delete the element at index ${idx}.`,
      arr(a, idx >= 0 && idx < a.length ? [{ index: idx, role: 'error' }] : []),
      { line: 1, vars: { index: idx, n: a.length } },
    );
    if (idx < 0 || idx >= a.length) {
      rec.snap('ERROR', `Index ${idx} is out of bounds.`, arr(a), { line: 1 });
      return rec.finish(null, 'Deletion rejected.', arr(a));
    }
    const removed = a[idx];
    for (let i = idx; i < a.length - 1; i++) {
      a[i] = a[i + 1];
      rec.snap(
        'SHIFT',
        `Shift a[${i + 1}] = ${a[i]} left to index ${i}.`,
        arr(
          a,
          [
            { index: i, role: 'write' },
            { index: i + 1, role: 'active' },
          ],
          [{ name: 'i', at: i }],
        ),
        { line: 3, vars: { i } },
      );
    }
    a.pop();
    rec.snap('DELETE', 'Shrink the array by removing the last slot.', arr(a), {
      line: 4,
      vars: { removed, n: a.length },
    });
    return rec.finish(a as number[], `Deleted ${removed}.`, arr(a));
  },
};

export const updateValue: AlgorithmDef = {
  id: 'array-update',
  name: 'Update value',
  category: 'arrays',
  visual: 'array',
  summary: 'Overwrite the value at an index in constant time.',
  pseudocode: ['if index < 0 or index >= n: error', 'a[index] = value'],
  complexity: { time: O1, space: 'O(1)' },
  inputs: [
    ARRAY_IN,
    { key: 'index', label: 'Index', type: 'number' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  defaultInput: { values: [5, 8, 2, 6], index: 2, value: 42 },
  run(input) {
    const a = nums(input, 'values');
    const idx = num(input, 'index');
    const value = num(input, 'value', { min: -9999, max: 9999 });
    const rec = new TraceRecorder<ArrayState>('array-update', { values: [...a], index: idx, value });
    rec.snap('INIT', `Set a[${idx}] to ${value}.`, arr(a), { line: 1 });
    if (idx < 0 || idx >= a.length) {
      rec.snap('ERROR', `Index ${idx} is out of bounds.`, arr(a), { line: 1 });
      return rec.finish(null, 'Update rejected.', arr(a));
    }
    const old = a[idx];
    a[idx] = value;
    rec.snap(
      'WRITE',
      `Overwrite ${old} with ${value}.`,
      arr(a, [{ index: idx, role: 'write' }], [{ name: 'i', at: idx }]),
      { line: 2, vars: { old, value } },
    );
    return rec.finish(a, 'Updated.', arr(a, [{ index: idx, role: 'found' }]));
  },
};

export const reverseArray: AlgorithmDef = {
  id: 'array-reverse',
  name: 'Reverse (two pointers)',
  category: 'arrays',
  visual: 'array',
  summary: 'Swap the outermost pair and move both pointers inward until they meet.',
  pseudocode: [
    'left = 0, right = n - 1',
    'while left < right:',
    '    swap a[left], a[right]',
    '    left++, right--',
  ],
  complexity: { time: ON, space: 'O(1)', inPlace: true },
  inputs: [ARRAY_IN],
  defaultInput: { values: [1, 2, 3, 4, 5, 6] },
  randomInput: (seed) => ({ values: randomInts(seed, 8) }),
  run(input) {
    const a = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('array-reverse', { values: [...a] });
    let l = 0;
    let r = a.length - 1;
    const p = () => [
      { name: 'left', at: l },
      { name: 'right', at: r },
    ];
    rec.snap('INIT', 'Start with pointers at both ends.', arr(a, [], a.length ? p() : []), {
      line: 1,
      vars: { left: l, right: r },
    });
    while (l < r) {
      rec.snap(
        'COMPARE',
        `left (${l}) < right (${r}), keep going.`,
        arr(
          a,
          [
            { index: l, role: 'compare' },
            { index: r, role: 'compare' },
          ],
          p(),
        ),
        { line: 2, vars: { left: l, right: r } },
      );
      [a[l], a[r]] = [a[r], a[l]];
      rec.snap(
        'SWAP',
        `Swap a[${l}] and a[${r}].`,
        arr(
          a,
          [
            { index: l, role: 'swap' },
            { index: r, role: 'swap' },
          ],
          p(),
        ),
        { line: 3, vars: { left: l, right: r } },
      );
      l++;
      r--;
      rec.snap('POINTER_MOVE', 'Move both pointers inward.', arr(a, [], l <= r ? p() : []), {
        line: 4,
        vars: { left: l, right: r },
      });
    }
    return rec.finish(
      a,
      'Pointers met — the array is reversed.',
      arr(
        a,
        a.map((_, i) => ({ index: i, role: 'sorted' as const })),
      ),
      2,
    );
  },
};

export const minMax: AlgorithmDef = {
  id: 'array-min-max',
  name: 'Find minimum and maximum',
  category: 'arrays',
  visual: 'array',
  summary: 'Scan once, tracking the smallest and largest value seen so far.',
  pseudocode: [
    'min = max = a[0]',
    'for i from 1 to n - 1:',
    '    if a[i] < min: min = a[i]',
    '    if a[i] > max: max = a[i]',
    'return (min, max)',
  ],
  complexity: { time: ON, space: 'O(1)' },
  inputs: [ARRAY_IN],
  defaultInput: { values: [12, 4, 19, 7, 3, 15] },
  randomInput: (seed) => ({ values: randomInts(seed, 8) }),
  run(input) {
    const a = nums(input, 'values', { min: 1 });
    const rec = new TraceRecorder<ArrayState>('array-min-max', { values: a });
    let mi = 0;
    let ma = 0;
    const p = (i: number) => [
      { name: 'i', at: i },
      { name: 'min', at: mi },
      { name: 'max', at: ma },
    ];
    rec.snap('INIT', `Start with min = max = a[0] = ${a[0]}.`, arr(a, [{ index: 0, role: 'active' }], p(0)), {
      line: 1,
      vars: { min: a[0], max: a[0] },
    });
    for (let i = 1; i < a.length; i++) {
      rec.snap(
        'COMPARE',
        `Compare a[${i}] = ${a[i]} with min ${a[mi]}.`,
        arr(
          a,
          [
            { index: i, role: 'compare' },
            { index: mi, role: 'active' },
          ],
          p(i),
        ),
        { line: 3, vars: { i, min: a[mi], max: a[ma] } },
      );
      if (a[i] < a[mi]) {
        mi = i;
        rec.snap('UPDATE', `New minimum ${a[i]}.`, arr(a, [{ index: i, role: 'found' }], p(i)), {
          line: 3,
          vars: { i, min: a[mi], max: a[ma] },
        });
      }
      rec.snap(
        'COMPARE',
        `Compare a[${i}] = ${a[i]} with max ${a[ma]}.`,
        arr(
          a,
          [
            { index: i, role: 'compare' },
            { index: ma, role: 'active' },
          ],
          p(i),
        ),
        { line: 4, vars: { i, min: a[mi], max: a[ma] } },
      );
      if (a[i] > a[ma]) {
        ma = i;
        rec.snap('UPDATE', `New maximum ${a[i]}.`, arr(a, [{ index: i, role: 'found' }], p(i)), {
          line: 4,
          vars: { i, min: a[mi], max: a[ma] },
        });
      }
    }
    return rec.finish(
      { min: a[mi], max: a[ma] },
      `Minimum ${a[mi]} at index ${mi}, maximum ${a[ma]} at index ${ma}.`,
      arr(
        a,
        [
          { index: mi, role: 'found' },
          { index: ma, role: 'found' },
        ],
        [
          { name: 'min', at: mi },
          { name: 'max', at: ma },
        ],
      ),
      5,
    );
  },
};

export const sumAverage: AlgorithmDef = {
  id: 'array-sum-average',
  name: 'Sum and average',
  category: 'arrays',
  visual: 'array',
  summary: 'Accumulate a running total, then divide by the length.',
  pseudocode: ['sum = 0', 'for each x in a:', '    sum = sum + x', 'average = sum / n'],
  complexity: { time: ON, space: 'O(1)' },
  inputs: [ARRAY_IN],
  defaultInput: { values: [4, 8, 15, 16, 23, 42] },
  randomInput: (seed) => ({ values: randomInts(seed, 7) }),
  run(input) {
    const a = nums(input, 'values', { min: 1 });
    const rec = new TraceRecorder<ArrayState>('array-sum-average', { values: a });
    let sum = 0;
    rec.snap('INIT', 'Start with sum = 0.', arr(a), { line: 1, vars: { sum } });
    a.forEach((x, i) => {
      sum += x;
      rec.snap(
        'READ',
        `Add a[${i}] = ${x}. Running sum = ${sum}.`,
        arr(
          a,
          [
            { index: i, role: 'active' },
            ...Array.from({ length: i }, (_, j) => ({ index: j, role: 'visited' as const })),
          ],
          [{ name: 'i', at: i }],
        ),
        { line: 3, vars: { i, x, sum } },
      );
    });
    const avg = Math.round((sum / a.length) * 1000) / 1000;
    return rec.finish(
      { sum, average: avg },
      `Sum = ${sum}, average = ${sum} / ${a.length} = ${avg}.`,
      arr(
        a,
        a.map((_, i) => ({ index: i, role: 'visited' as const })),
      ),
      4,
    );
  },
};

function reverseRange(
  a: number[],
  from: number,
  to: number,
  rec: TraceRecorder<ArrayState>,
  line: number,
  label: string,
) {
  let l = from;
  let r = to;
  while (l < r) {
    [a[l], a[r]] = [a[r], a[l]];
    rec.snap(
      'SWAP',
      `${label}: swap a[${l}] and a[${r}].`,
      arr(
        a,
        [
          { index: l, role: 'swap' },
          { index: r, role: 'swap' },
        ],
        [
          { name: 'l', at: l },
          { name: 'r', at: r },
        ],
        { ranges: [{ from, to, label }] },
      ),
      { line, vars: { l, r } },
    );
    l++;
    r--;
  }
}

function rotateDef(dir: 'left' | 'right'): AlgorithmDef {
  return {
    id: `array-rotate-${dir}`,
    name: `Rotate ${dir} by k`,
    category: 'arrays',
    visual: 'array',
    summary: `Rotate ${dir} using three in-place reversals (the reversal algorithm).`,
    pseudocode:
      dir === 'left'
        ? ['k = k mod n', 'reverse a[0 .. k-1]', 'reverse a[k .. n-1]', 'reverse a[0 .. n-1]']
        : ['k = k mod n', 'reverse a[0 .. n-1]', 'reverse a[0 .. k-1]', 'reverse a[k .. n-1]'],
    complexity: { time: ON, space: 'O(1)', inPlace: true },
    inputs: [ARRAY_IN, { key: 'k', label: 'k', type: 'number', min: 0, max: 100 }],
    defaultInput: { values: [1, 2, 3, 4, 5, 6, 7], k: 3 },
    run(input) {
      const a = nums(input, 'values');
      const k0 = num(input, 'k', { min: 0, max: 100 });
      const rec = new TraceRecorder<ArrayState>(`array-rotate-${dir}`, { values: [...a], k: k0 });
      const n = a.length;
      const k = n === 0 ? 0 : k0 % n;
      rec.snap('INIT', `Rotate ${dir} by ${k0}; effective k = ${k}.`, arr(a), { line: 1, vars: { k, n } });
      if (dir === 'left') {
        reverseRange(a, 0, k - 1, rec, 2, 'first k');
        reverseRange(a, k, n - 1, rec, 3, 'rest');
        reverseRange(a, 0, n - 1, rec, 4, 'whole');
      } else {
        reverseRange(a, 0, n - 1, rec, 2, 'whole');
        reverseRange(a, 0, k - 1, rec, 3, 'first k');
        reverseRange(a, k, n - 1, rec, 4, 'rest');
      }
      return rec.finish(a, `Rotated ${dir} by ${k}.`, arr(a));
    },
  };
}
export const rotateLeft = rotateDef('left');
export const rotateRight = rotateDef('right');

export const mergeSortedArrays: AlgorithmDef = {
  id: 'array-merge-sorted',
  name: 'Merge two sorted arrays',
  category: 'arrays',
  visual: 'array',
  summary: 'Walk both arrays with one pointer each, always taking the smaller head.',
  pseudocode: [
    'i = 0, j = 0, out = []',
    'while i < len(A) and j < len(B):',
    '    if A[i] <= B[j]: out.append(A[i]); i++',
    '    else: out.append(B[j]); j++',
    'append remaining A[i..]',
    'append remaining B[j..]',
  ],
  complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(n+m)', stable: true },
  assumptions: ['Both inputs must be sorted ascending.'],
  inputs: [
    { key: 'a', label: 'Array A (sorted)', type: 'numbers' },
    { key: 'b', label: 'Array B (sorted)', type: 'numbers' },
  ],
  defaultInput: { a: [1, 4, 7, 10], b: [2, 3, 8, 12, 15] },
  randomInput: (seed) => ({ a: sortedRandomInts(seed, 5), b: sortedRandomInts(seed + 7, 5) }),
  run(input) {
    const A = nums(input, 'a', { max: 12 });
    const B = nums(input, 'b', { max: 12 });
    for (const [name, v] of [
      ['A', A],
      ['B', B],
    ] as const)
      for (let i = 1; i < v.length; i++)
        if (v[i - 1] > v[i]) throw new InputError(`Array ${name} must be sorted ascending.`);
    const rec = new TraceRecorder<ArrayState>('array-merge-sorted', { a: A, b: B });
    const out: number[] = [];
    let i = 0;
    let j = 0;
    const state = (hl: Highlight[] = [], bh: Highlight[] = []) =>
      arr(out, out.length ? [{ index: out.length - 1, role: 'write' }] : [], [], {
        aux: [
          {
            label: 'A',
            values: A,
            highlights: [...hl, ...(i < A.length ? [{ index: i, role: 'active' as const }] : [])],
          },
          {
            label: 'B',
            values: B,
            highlights: [...bh, ...(j < B.length ? [{ index: j, role: 'active' as const }] : [])],
          },
        ],
      });
    rec.snap('INIT', 'Pointers i and j start at the heads of A and B.', state(), { line: 1, vars: { i, j } });
    while (i < A.length && j < B.length) {
      rec.snap(
        'COMPARE',
        `Compare A[${i}] = ${A[i]} with B[${j}] = ${B[j]}.`,
        state([{ index: i, role: 'compare' }], [{ index: j, role: 'compare' }]),
        { line: 2, vars: { i, j } },
      );
      if (A[i] <= B[j]) {
        out.push(A[i++]);
        rec.snap(
          'WRITE',
          `Take ${out[out.length - 1]} from A (ties take A, keeping the merge stable).`,
          state(),
          { line: 3, vars: { i, j } },
        );
      } else {
        out.push(B[j++]);
        rec.snap('WRITE', `Take ${out[out.length - 1]} from B.`, state(), { line: 4, vars: { i, j } });
      }
    }
    while (i < A.length) {
      out.push(A[i++]);
      rec.snap('WRITE', `B is exhausted; copy ${out[out.length - 1]} from A.`, state(), {
        line: 5,
        vars: { i, j },
      });
    }
    while (j < B.length) {
      out.push(B[j++]);
      rec.snap('WRITE', `A is exhausted; copy ${out[out.length - 1]} from B.`, state(), {
        line: 6,
        vars: { i, j },
      });
    }
    return rec.finish(
      out,
      `Merged ${out.length} values.`,
      arr(
        out,
        out.map((_, k) => ({ index: k, role: 'sorted' as const })),
      ),
    );
  },
};

export const removeDuplicatesSorted: AlgorithmDef = {
  id: 'array-remove-duplicates',
  name: 'Remove duplicates (sorted)',
  category: 'arrays',
  visual: 'array',
  summary: 'A slow "write" pointer keeps unique values while a fast "read" pointer scans.',
  pseudocode: [
    'if n == 0: return 0',
    'write = 1',
    'for read from 1 to n - 1:',
    '    if a[read] != a[write - 1]:',
    '        a[write] = a[read]; write++',
    'return write  // a[0..write-1] is unique',
  ],
  complexity: { time: ON, space: 'O(1)', inPlace: true },
  assumptions: ['Input must be sorted so duplicates are adjacent.'],
  inputs: [ARRAY_IN],
  defaultInput: { values: [1, 1, 2, 3, 3, 3, 4, 5, 5] },
  randomInput: (seed) => ({ values: sortedRandomInts(seed, 10, 1, 6) }),
  run(input) {
    const a = nums(input, 'values');
    for (let i = 1; i < a.length; i++)
      if (a[i - 1] > a[i]) throw new InputError('Input must be sorted ascending.');
    const rec = new TraceRecorder<ArrayState>('array-remove-duplicates', { values: [...a] });
    if (a.length === 0) return rec.finish(0, 'Empty array — nothing to do.', arr(a), 1);
    let w = 1;
    const kept = () => Array.from({ length: w }, (_, k) => ({ index: k, role: 'sorted' as const }));
    rec.snap(
      'INIT',
      'a[0] is always unique; write starts at 1.',
      arr(a, kept(), [{ name: 'write', at: w }]),
      { line: 2, vars: { write: w } },
    );
    for (let r = 1; r < a.length; r++) {
      rec.snap(
        'COMPARE',
        `Is a[${r}] = ${a[r]} different from the last kept value ${a[w - 1]}?`,
        arr(
          a,
          [...kept(), { index: r, role: 'compare' }, { index: w - 1, role: 'compare' }],
          [
            { name: 'write', at: w },
            { name: 'read', at: r },
          ],
        ),
        { line: 4, vars: { read: r, write: w } },
      );
      if (a[r] !== a[w - 1]) {
        a[w] = a[r];
        w++;
        rec.snap(
          'WRITE',
          `New value — copy it to index ${w - 1}.`,
          arr(
            a,
            [...kept(), { index: w - 1, role: 'write' }],
            [
              { name: 'write', at: w },
              { name: 'read', at: r },
            ],
          ),
          { line: 5, vars: { read: r, write: w } },
        );
      }
    }
    return rec.finish(
      w,
      `${w} unique values occupy a[0..${w - 1}].`,
      arr(a, kept(), [], { ranges: [{ from: 0, to: w - 1, label: 'unique' }] }),
      6,
    );
  },
};

export const secondLargest: AlgorithmDef = {
  id: 'array-second-largest',
  name: 'Second-largest element',
  category: 'arrays',
  visual: 'array',
  summary: 'Track the largest and second-largest distinct values in a single pass.',
  pseudocode: [
    'first = second = none',
    'for each x in a:',
    '    if first is none or x > first:',
    '        second = first; first = x',
    '    else if x != first and (second is none or x > second):',
    '        second = x',
    'return second',
  ],
  complexity: { time: ON, space: 'O(1)' },
  assumptions: ['"Second largest" means second largest distinct value; returns none if it does not exist.'],
  inputs: [ARRAY_IN],
  defaultInput: { values: [12, 35, 1, 10, 34, 1] },
  randomInput: (seed) => ({ values: randomInts(seed, 8) }),
  run(input) {
    const a = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('array-second-largest', { values: a });
    let first: number | null = null;
    let second: number | null = null;
    rec.snap('INIT', 'No values seen yet.', arr(a), { line: 1, vars: { first, second } });
    a.forEach((x, i) => {
      rec.snap(
        'COMPARE',
        `Compare ${x} with first = ${first ?? 'none'}, second = ${second ?? 'none'}.`,
        arr(a, [{ index: i, role: 'compare' }], [{ name: 'i', at: i }]),
        { line: 3, vars: { x, first, second } },
      );
      if (first === null || x > first) {
        second = first;
        first = x;
        rec.snap(
          'UPDATE',
          `${x} is the new largest; old largest becomes second.`,
          arr(a, [{ index: i, role: 'found' }], [{ name: 'i', at: i }]),
          { line: 4, vars: { first, second } },
        );
      } else if (x !== first && (second === null || x > second)) {
        second = x;
        rec.snap(
          'UPDATE',
          `${x} is the new second largest.`,
          arr(a, [{ index: i, role: 'found' }], [{ name: 'i', at: i }]),
          { line: 6, vars: { first, second } },
        );
      }
    });
    return rec.finish(
      second,
      second === null ? 'No second-largest distinct value exists.' : `Second largest = ${second}.`,
      arr(a),
      7,
    );
  },
};

export const ARRAY_ALGORITHMS: AlgorithmDef[] = [
  accessElement,
  insertAt,
  deleteAt,
  updateValue,
  reverseArray,
  minMax,
  sumAverage,
  rotateLeft,
  rotateRight,
  mergeSortedArrays,
  removeDuplicatesSorted,
  secondLargest,
];
