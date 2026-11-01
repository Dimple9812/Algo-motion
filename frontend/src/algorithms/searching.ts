import { InputError, TraceRecorder } from '@/engine/recorder';
import type { ArrayState, Highlight } from '@/engine/types';
import { arr } from './arrays';
import type { AlgorithmDef } from './types';
import { num, nums, randomInts, requireSorted, sortedRandomInts } from './util';

const ARRAY_IN = { key: 'values', label: 'Array', type: 'numbers' as const };
const TARGET_IN = { key: 'target', label: 'Target', type: 'number' as const };

export const linearSearch: AlgorithmDef = {
  id: 'linear-search',
  name: 'Linear search',
  category: 'searching',
  visual: 'array',
  summary: 'Check each element from left to right until the target is found.',
  pseudocode: ['for i from 0 to n - 1:', '    if a[i] == target:', '        return i', 'return -1'],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  inputs: [ARRAY_IN, TARGET_IN],
  defaultInput: { values: [4, 8, 12, 16, 23, 42], target: 16 },
  randomInput: (seed) => {
    const values = randomInts(seed, 8);
    return { values, target: values[seed % 8] };
  },
  run(input) {
    const a = nums(input, 'values');
    const target = num(input, 'target');
    const rec = new TraceRecorder<ArrayState>('linear-search', { values: a, target });
    rec.snap('INIT', `Search for ${target} from the left.`, arr(a), { line: 1, vars: { target } });
    for (let i = 0; i < a.length; i++) {
      const visited: Highlight[] = Array.from({ length: i }, (_, k) => ({ index: k, role: 'visited' }));
      rec.snap(
        'COMPARE',
        `Compare a[${i}] = ${a[i]} with target ${target}.`,
        arr(a, [...visited, { index: i, role: 'compare' }], [{ name: 'i', at: i }]),
        { line: 2, vars: { i, current: a[i], target } },
      );
      if (a[i] === target) {
        rec.snap(
          'FOUND',
          `Found ${target} at index ${i}.`,
          arr(a, [...visited, { index: i, role: 'found' }], [{ name: 'i', at: i }]),
          { line: 3, vars: { i, target } },
        );
        return rec.finish(i, `Returned index ${i}.`, arr(a, [{ index: i, role: 'found' }]), 3);
      }
    }
    rec.snap(
      'NOT_FOUND',
      `${target} is not in the array.`,
      arr(
        a,
        a.map((_, k) => ({ index: k, role: 'visited' as const })),
      ),
      { line: 4, vars: { target } },
    );
    return rec.finish(-1, 'Returned -1.', arr(a), 4);
  },
};

export const binarySearch: AlgorithmDef = {
  id: 'binary-search',
  name: 'Binary search',
  category: 'searching',
  visual: 'array',
  summary: 'Halve the search range each step by comparing the target with the middle element.',
  pseudocode: [
    'low = 0, high = n - 1',
    'while low <= high:',
    '    mid = low + (high - low) / 2',
    '    if a[mid] == target: return mid',
    '    else if a[mid] < target: low = mid + 1',
    '    else: high = mid - 1',
    'return -1',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
  assumptions: ['The array must be sorted in ascending order.'],
  inputs: [ARRAY_IN, TARGET_IN],
  defaultInput: { values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
  randomInput: (seed) => {
    const values = sortedRandomInts(seed, 12);
    return { values, target: values[seed % 12] };
  },
  run(input) {
    const a = nums(input, 'values');
    const target = num(input, 'target');
    requireSorted(a, 'Binary search');
    const rec = new TraceRecorder<ArrayState>('binary-search', { values: a, target });
    let low = 0;
    let high = a.length - 1;
    const out = (): Highlight[] =>
      a.flatMap((_, k) => (k < low || k > high ? [{ index: k, role: 'muted' as const }] : []));
    const ptr = (mid?: number) => [
      ...(low < a.length ? [{ name: 'low', at: low }] : []),
      ...(high >= 0 ? [{ name: 'high', at: high }] : []),
      ...(mid !== undefined ? [{ name: 'mid', at: mid }] : []),
    ];
    rec.snap(
      'INIT',
      `Search for ${target} in the whole range [0, ${high}].`,
      arr(a, [], ptr(), { ranges: [{ from: low, to: high, label: 'range' }] }),
      { line: 1, vars: { low, high, target } },
    );
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      rec.snap(
        'POINTER_MOVE',
        `mid = ${low} + (${high} - ${low}) / 2 = ${mid}.`,
        arr(a, [...out(), { index: mid, role: 'active' }], ptr(mid), {
          ranges: [{ from: low, to: high, label: 'range' }],
        }),
        { line: 3, vars: { low, high, mid } },
      );
      rec.snap(
        'COMPARE',
        `Compare a[${mid}] = ${a[mid]} with ${target}.`,
        arr(a, [...out(), { index: mid, role: 'compare' }], ptr(mid), {
          ranges: [{ from: low, to: high, label: 'range' }],
        }),
        { line: 4, vars: { low, high, mid, 'a[mid]': a[mid] } },
      );
      if (a[mid] === target) {
        rec.snap(
          'FOUND',
          `a[${mid}] equals the target.`,
          arr(a, [...out(), { index: mid, role: 'found' }], ptr(mid)),
          { line: 4, vars: { mid } },
        );
        return rec.finish(
          mid,
          `Found ${target} at index ${mid}.`,
          arr(a, [{ index: mid, role: 'found' }], [{ name: 'mid', at: mid }]),
          4,
        );
      }
      if (a[mid] < target) {
        low = mid + 1;
        rec.snap(
          'POINTER_MOVE',
          `${a[mid]} < ${target}: discard the left half, low = ${low}.`,
          arr(a, out(), ptr(), { ranges: low <= high ? [{ from: low, to: high, label: 'range' }] : [] }),
          { line: 5, vars: { low, high } },
        );
      } else {
        high = mid - 1;
        rec.snap(
          'POINTER_MOVE',
          `${a[mid]} > ${target}: discard the right half, high = ${high}.`,
          arr(a, out(), ptr(), { ranges: low <= high ? [{ from: low, to: high, label: 'range' }] : [] }),
          { line: 6, vars: { low, high } },
        );
      }
    }
    rec.snap(
      'NOT_FOUND',
      `low (${low}) > high (${high}): the range is empty, so ${target} is absent.`,
      arr(
        a,
        a.map((_, k) => ({ index: k, role: 'muted' as const })),
      ),
      { line: 7, vars: { low, high } },
    );
    return rec.finish(-1, 'Returned -1.', arr(a), 7);
  },
};

type BoundKind = 'first' | 'last' | 'lower' | 'upper';

function boundDef(kind: BoundKind): AlgorithmDef {
  const meta: Record<
    BoundKind,
    { id: string; name: string; summary: string; cond: string; onHit: string; ret: string }
  > = {
    first: {
      id: 'first-occurrence',
      name: 'First occurrence',
      summary: 'Binary search that keeps searching left after a match.',
      cond: 'a[mid] >= target',
      onHit: 'if a[mid] == target: ans = mid',
      ret: 'return ans (or -1)',
    },
    last: {
      id: 'last-occurrence',
      name: 'Last occurrence',
      summary: 'Binary search that keeps searching right after a match.',
      cond: 'a[mid] <= target',
      onHit: 'if a[mid] == target: ans = mid',
      ret: 'return ans (or -1)',
    },
    lower: {
      id: 'lower-bound',
      name: 'Lower bound',
      summary: 'First index whose value is ≥ target (insertion point).',
      cond: 'a[mid] >= target',
      onHit: 'ans = mid',
      ret: 'return ans (n if none)',
    },
    upper: {
      id: 'upper-bound',
      name: 'Upper bound',
      summary: 'First index whose value is > target.',
      cond: 'a[mid] > target',
      onHit: 'ans = mid',
      ret: 'return ans (n if none)',
    },
  };
  const m = meta[kind];
  const goesLeft = kind !== 'last';
  return {
    id: m.id,
    name: m.name,
    category: 'searching',
    visual: 'array',
    summary: m.summary,
    pseudocode: [
      `low = 0, high = n - 1, ans = ${kind === 'lower' || kind === 'upper' ? 'n' : '-1'}`,
      'while low <= high:',
      '    mid = low + (high - low) / 2',
      `    if ${m.cond}:`,
      `        ${m.onHit}`,
      goesLeft ? '        high = mid - 1' : '        low = mid + 1',
      `    else: ${goesLeft ? 'low = mid + 1' : 'high = mid - 1'}`,
      m.ret,
    ],
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
    assumptions: ['The array must be sorted in ascending order. Duplicates are allowed.'],
    inputs: [ARRAY_IN, TARGET_IN],
    defaultInput: { values: [1, 3, 3, 3, 5, 7, 7, 9], target: 3 },
    randomInput: (seed) => {
      const values = sortedRandomInts(seed, 10, 1, 8);
      return { values, target: values[seed % 10] };
    },
    run(input) {
      const a = nums(input, 'values');
      const target = num(input, 'target');
      requireSorted(a, m.name);
      const rec = new TraceRecorder<ArrayState>(m.id, { values: a, target });
      let low = 0;
      let high = a.length - 1;
      let ans = kind === 'lower' || kind === 'upper' ? a.length : -1;
      const muted = (): Highlight[] =>
        a.flatMap((_, k) => (k < low || k > high ? [{ index: k, role: 'muted' as const }] : []));
      const ptr = (mid?: number) => [
        ...(low < a.length ? [{ name: 'low', at: low }] : []),
        ...(high >= 0 ? [{ name: 'high', at: high }] : []),
        ...(mid !== undefined ? [{ name: 'mid', at: mid }] : []),
        ...(ans >= 0 && ans < a.length ? [{ name: 'ans', at: ans }] : []),
      ];
      rec.snap('INIT', `Find the ${m.name.toLowerCase()} of ${target}.`, arr(a, [], ptr()), {
        line: 1,
        vars: { low, high, ans },
      });
      while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        const hit =
          kind === 'first' || kind === 'lower'
            ? a[mid] >= target
            : kind === 'last'
              ? a[mid] <= target
              : a[mid] > target;
        rec.snap(
          'COMPARE',
          `mid = ${mid}; test ${m.cond.replace('a[mid]', String(a[mid])).replace('target', String(target))} → ${hit}.`,
          arr(a, [...muted(), { index: mid, role: 'compare' }], ptr(mid)),
          { line: 4, vars: { low, high, mid, ans } },
        );
        if (hit) {
          if (kind === 'lower' || kind === 'upper' || a[mid] === target) {
            ans = mid;
            rec.snap(
              'UPDATE',
              `Record ans = ${mid}.`,
              arr(a, [...muted(), { index: mid, role: 'found' }], ptr(mid)),
              { line: 5, vars: { ans } },
            );
          }
          if (goesLeft) high = mid - 1;
          else low = mid + 1;
          rec.snap(
            'POINTER_MOVE',
            goesLeft ? `Keep looking left: high = ${high}.` : `Keep looking right: low = ${low}.`,
            arr(a, muted(), ptr()),
            { line: 6, vars: { low, high, ans } },
          );
        } else {
          if (goesLeft) low = mid + 1;
          else high = mid - 1;
          rec.snap(
            'POINTER_MOVE',
            goesLeft ? `Go right: low = ${low}.` : `Go left: high = ${high}.`,
            arr(a, muted(), ptr()),
            { line: 7, vars: { low, high, ans } },
          );
        }
      }
      const found = ans >= 0 && ans < a.length;
      rec.snap(
        found ? 'FOUND' : 'NOT_FOUND',
        found ? `Answer index ${ans}.` : `No matching index; answer is ${ans}.`,
        arr(a, found ? [{ index: ans, role: 'found' }] : [], found ? [{ name: 'ans', at: ans }] : []),
        { line: 8, vars: { ans } },
      );
      return rec.finish(ans, `Returned ${ans}.`, arr(a, found ? [{ index: ans, role: 'found' }] : []), 8);
    },
  };
}

export const firstOccurrence = boundDef('first');
export const lastOccurrence = boundDef('last');
export const lowerBound = boundDef('lower');
export const upperBound = boundDef('upper');

export const searchRotated: AlgorithmDef = {
  id: 'search-rotated',
  name: 'Search in rotated sorted array',
  category: 'searching',
  visual: 'array',
  summary: 'At every step one half is sorted; check whether the target lies in that half.',
  pseudocode: [
    'low = 0, high = n - 1',
    'while low <= high:',
    '    mid = (low + high) / 2',
    '    if a[mid] == target: return mid',
    '    if a[low] <= a[mid]:  // left half sorted',
    '        if a[low] <= target < a[mid]: high = mid - 1 else: low = mid + 1',
    '    else:                 // right half sorted',
    '        if a[mid] < target <= a[high]: low = mid + 1 else: high = mid - 1',
    'return -1',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
  assumptions: ['Values are distinct and the array is an ascending array rotated at some pivot.'],
  inputs: [ARRAY_IN, TARGET_IN],
  defaultInput: { values: [15, 18, 22, 30, 2, 5, 9, 12], target: 5 },
  run(input) {
    const a = nums(input, 'values');
    const target = num(input, 'target');
    if (new Set(a).size !== a.length) throw new InputError('Values must be distinct.');
    let drops = 0;
    for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) drops++;
    if (drops > 1 || (drops === 1 && a.length > 1 && a[a.length - 1] > a[0]))
      throw new InputError('Array must be a rotated ascending array.');
    const rec = new TraceRecorder<ArrayState>('search-rotated', { values: a, target });
    let low = 0;
    let high = a.length - 1;
    const muted = (): Highlight[] =>
      a.flatMap((_, k) => (k < low || k > high ? [{ index: k, role: 'muted' as const }] : []));
    rec.snap(
      'INIT',
      `Search for ${target}.`,
      arr(
        a,
        [],
        [
          { name: 'low', at: low },
          { name: 'high', at: Math.max(high, 0) },
        ],
      ),
      { line: 1, vars: { low, high } },
    );
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const p = [
        { name: 'low', at: low },
        { name: 'mid', at: mid },
        { name: 'high', at: high },
      ];
      rec.snap(
        'COMPARE',
        `Compare a[${mid}] = ${a[mid]} with ${target}.`,
        arr(a, [...muted(), { index: mid, role: 'compare' }], p),
        { line: 4, vars: { low, mid, high } },
      );
      if (a[mid] === target) {
        rec.snap('FOUND', `Found at index ${mid}.`, arr(a, [{ index: mid, role: 'found' }], p), {
          line: 4,
          vars: { mid },
        });
        return rec.finish(mid, `Returned ${mid}.`, arr(a, [{ index: mid, role: 'found' }]), 4);
      }
      if (a[low] <= a[mid]) {
        const inLeft = a[low] <= target && target < a[mid];
        rec.snap(
          'COMPARE',
          `Left half [${low}..${mid}] is sorted. Target ${inLeft ? 'is' : 'is not'} inside it.`,
          arr(a, [...muted(), ...range(low, mid, 'active')], p),
          { line: 6, vars: { low, mid, high } },
        );
        if (inLeft) high = mid - 1;
        else low = mid + 1;
      } else {
        const inRight = a[mid] < target && target <= a[high];
        rec.snap(
          'COMPARE',
          `Right half [${mid}..${high}] is sorted. Target ${inRight ? 'is' : 'is not'} inside it.`,
          arr(a, [...muted(), ...range(mid, high, 'active')], p),
          { line: 8, vars: { low, mid, high } },
        );
        if (inRight) low = mid + 1;
        else high = mid - 1;
      }
      rec.snap(
        'POINTER_MOVE',
        `New range [${low}, ${high}].`,
        arr(
          a,
          muted(),
          low <= high
            ? [
                { name: 'low', at: low },
                { name: 'high', at: high },
              ]
            : [],
        ),
        { vars: { low, high } },
      );
    }
    rec.snap('NOT_FOUND', `${target} is not present.`, arr(a), { line: 9 });
    return rec.finish(-1, 'Returned -1.', arr(a), 9);
  },
};

function range(from: number, to: number, role: Highlight['role']): Highlight[] {
  return Array.from({ length: to - from + 1 }, (_, k) => ({ index: from + k, role }));
}

export const SEARCH_ALGORITHMS: AlgorithmDef[] = [
  linearSearch,
  binarySearch,
  firstOccurrence,
  lastOccurrence,
  lowerBound,
  upperBound,
  searchRotated,
];
