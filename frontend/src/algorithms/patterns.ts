import { InputError, TraceRecorder } from '@/engine/recorder';
import type { ArrayState, GridState, Highlight, TreeState } from '@/engine/types';
import { arr } from './arrays';
import { grid } from './dp';
import { heapState } from './heapTrie';
import type { AlgorithmDef } from './types';
import { num, nums, randomInts, requireSorted, sortedRandomInts, str } from './util';

const range = (from: number, to: number, role: Highlight['role']): Highlight[] =>
  to < from ? [] : Array.from({ length: to - from + 1 }, (_, k) => ({ index: from + k, role }));

export const twoSum: AlgorithmDef = {
  id: 'pattern-two-sum',
  name: 'Two Sum (hash map)',
  category: 'patterns',
  visual: 'array',
  summary: 'For each value, check whether its complement was already seen; store value → index otherwise.',
  pseudocode: [
    'seen = {}',
    'for i, x in enumerate(a):',
    '    if target - x in seen: return [seen[target - x], i]',
    '    seen[x] = i',
    'return none',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  inputs: [
    { key: 'values', label: 'Array', type: 'numbers' },
    { key: 'target', label: 'Target', type: 'number' },
  ],
  defaultInput: { values: [2, 7, 11, 15, 3, 6], target: 9 },
  randomInput: (seed) => {
    const values = randomInts(seed, 8, 1, 20);
    return { values, target: values[1] + values[5] };
  },
  run(input) {
    const a = nums(input, 'values');
    const target = num(input, 'target');
    const seen = new Map<number, number>();
    const rec = new TraceRecorder<ArrayState>('pattern-two-sum', { values: a, target });
    const mapView = () => [
      { label: 'seen (value:index)', values: [...seen.entries()].map(([k, v]) => `${k}:${v}`) },
    ];
    rec.snap('INIT', `Find two indices whose values sum to ${target}.`, arr(a, [], [], { aux: mapView() }), {
      line: 1,
    });
    for (let i = 0; i < a.length; i++) {
      const need = target - a[i];
      rec.snap(
        'COMPARE',
        `x = ${a[i]}; need complement ${need}. In map? ${seen.has(need) ? 'yes' : 'no'}.`,
        arr(a, [{ index: i, role: 'compare' }], [{ name: 'i', at: i }], { aux: mapView() }),
        { line: 3, vars: { i, x: a[i], need } },
      );
      if (seen.has(need)) {
        const j = seen.get(need)!;
        rec.snap(
          'FOUND',
          `a[${j}] + a[${i}] = ${a[j]} + ${a[i]} = ${target}.`,
          arr(
            a,
            [
              { index: j, role: 'found' },
              { index: i, role: 'found' },
            ],
            [],
            { aux: mapView() },
          ),
          { line: 3 },
        );
        return rec.finish(
          [j, i],
          `Answer [${j}, ${i}].`,
          arr(a, [
            { index: j, role: 'found' },
            { index: i, role: 'found' },
          ]),
          3,
        );
      }
      seen.set(a[i], i);
      rec.snap(
        'INSERT',
        `Remember ${a[i]} → ${i}.`,
        arr(a, [{ index: i, role: 'visited' }], [{ name: 'i', at: i }], { aux: mapView() }),
        { line: 4 },
      );
    }
    rec.snap('NOT_FOUND', 'No pair sums to the target.', arr(a, [], [], { aux: mapView() }), { line: 5 });
    return rec.finish(null, 'No solution.', arr(a), 5);
  },
};

export const pairSumSorted: AlgorithmDef = {
  id: 'pattern-two-pointers',
  name: 'Two pointers: pair sum in sorted array',
  category: 'patterns',
  visual: 'array',
  summary: 'Move the left pointer right when the sum is too small and the right pointer left when too big.',
  pseudocode: [
    'l = 0, r = n - 1',
    'while l < r:',
    '    s = a[l] + a[r]',
    '    if s == target: return (l, r)',
    '    if s < target: l++ else: r--',
    'return none',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  assumptions: ['Array must be sorted ascending.'],
  inputs: [
    { key: 'values', label: 'Sorted array', type: 'numbers' },
    { key: 'target', label: 'Target', type: 'number' },
  ],
  defaultInput: { values: [1, 3, 4, 6, 8, 11, 14], target: 14 },
  randomInput: (seed) => {
    const values = sortedRandomInts(seed, 9, 1, 30);
    return { values, target: values[2] + values[7] };
  },
  run(input) {
    const a = nums(input, 'values');
    const target = num(input, 'target');
    requireSorted(a, 'Two pointers');
    const rec = new TraceRecorder<ArrayState>('pattern-two-pointers', { values: a, target });
    let l = 0;
    let r = a.length - 1;
    const p = () => [
      { name: 'l', at: l },
      { name: 'r', at: r },
    ];
    rec.snap('INIT', 'Pointers at both ends.', arr(a, [], a.length ? p() : []), { line: 1 });
    while (l < r) {
      const s = a[l] + a[r];
      rec.snap(
        'COMPARE',
        `${a[l]} + ${a[r]} = ${s} vs ${target}.`,
        arr(
          a,
          [
            { index: l, role: 'compare' },
            { index: r, role: 'compare' },
          ],
          p(),
        ),
        { line: 3, vars: { l, r, sum: s } },
      );
      if (s === target) {
        rec.snap(
          'FOUND',
          'Match!',
          arr(
            a,
            [
              { index: l, role: 'found' },
              { index: r, role: 'found' },
            ],
            p(),
          ),
          { line: 4 },
        );
        return rec.finish(
          [l, r],
          `Pair (${a[l]}, ${a[r]}) at [${l}, ${r}].`,
          arr(a, [
            { index: l, role: 'found' },
            { index: r, role: 'found' },
          ]),
          4,
        );
      }
      if (s < target) l++;
      else r--;
      rec.snap(
        'POINTER_MOVE',
        s < target ? 'Sum too small — move l right.' : 'Sum too big — move r left.',
        arr(a, [], p()),
        { line: 5, vars: { l, r } },
      );
    }
    rec.snap('NOT_FOUND', 'Pointers crossed — no pair.', arr(a), { line: 6 });
    return rec.finish(null, 'No pair.', arr(a), 6);
  },
};

export const longestUniqueSubstring: AlgorithmDef = {
  id: 'pattern-sliding-window',
  name: 'Sliding window: longest substring without repeats',
  category: 'patterns',
  visual: 'array',
  summary:
    'Grow the window on the right; when a character repeats, jump the left edge past its last occurrence.',
  pseudocode: [
    'last = {}; left = 0; best = 0',
    'for right, ch in enumerate(s):',
    '    if ch in last and last[ch] >= left: left = last[ch] + 1',
    '    last[ch] = right',
    '    best = max(best, right - left + 1)',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(alphabet)' },
  inputs: [{ key: 's', label: 'String', type: 'text', maxLength: 20 }],
  defaultInput: { s: 'abcabcbb' },
  run(input) {
    const s = str(input, 's', 20);
    const chars = [...s];
    const last = new Map<string, number>();
    let left = 0;
    let best = 0;
    let bestL = 0;
    const rec = new TraceRecorder<ArrayState>('pattern-sliding-window', { s });
    rec.snap('INIT', 'Empty window.', arr(chars), { line: 1 });
    chars.forEach((ch, right) => {
      if (last.has(ch) && last.get(ch)! >= left) {
        const old = left;
        left = last.get(ch)! + 1;
        rec.snap(
          'POINTER_MOVE',
          `'${ch}' repeats (last at ${last.get(ch)}) — move left from ${old} to ${left}.`,
          arr(
            chars,
            [
              { index: right, role: 'error' },
              { index: last.get(ch)!, role: 'error' },
            ],
            [
              { name: 'L', at: left },
              { name: 'R', at: right },
            ],
            { ranges: [{ from: left, to: right, label: 'window' }] },
          ),
          { line: 3, vars: { left, right, best } },
        );
      }
      last.set(ch, right);
      if (right - left + 1 > best) {
        best = right - left + 1;
        bestL = left;
      }
      rec.snap(
        'UPDATE',
        `Window "${s.slice(left, right + 1)}" has length ${right - left + 1}; best = ${best}.`,
        arr(
          chars,
          range(left, right, 'active'),
          [
            { name: 'L', at: left },
            { name: 'R', at: right },
          ],
          { ranges: [{ from: left, to: right, label: 'window' }] },
        ),
        { line: 5, vars: { left, right, best } },
      );
    });
    return rec.finish(
      best,
      `Longest: "${s.slice(bestL, bestL + best)}" (length ${best}).`,
      arr(chars, range(bestL, bestL + best - 1, 'found')),
      5,
    );
  },
};

export const maxSumWindow: AlgorithmDef = {
  id: 'pattern-fixed-window',
  name: 'Fixed sliding window: max sum of k',
  category: 'patterns',
  visual: 'array',
  summary: 'Slide a window of size k, adding the entering value and subtracting the leaving one.',
  pseudocode: [
    'sum = a[0] + … + a[k-1]; best = sum',
    'for i from k to n - 1:',
    '    sum += a[i] - a[i - k]',
    '    best = max(best, sum)',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  inputs: [
    { key: 'values', label: 'Array', type: 'numbers' },
    { key: 'k', label: 'k', type: 'number', min: 1, max: 24 },
  ],
  defaultInput: { values: [2, 1, 5, 1, 3, 2, 9, 1], k: 3 },
  randomInput: (seed) => ({ values: randomInts(seed, 10, 1, 9), k: 3 }),
  run(input) {
    const a = nums(input, 'values');
    const k = num(input, 'k', { min: 1, max: a.length || 1 });
    if (k > a.length) throw new InputError('k must be ≤ array length.');
    const rec = new TraceRecorder<ArrayState>('pattern-fixed-window', { values: a, k });
    let sum = a.slice(0, k).reduce((x, y) => x + y, 0);
    let best = sum;
    let bestI = 0;
    rec.snap(
      'INIT',
      `First window sum = ${sum}.`,
      arr(a, range(0, k - 1, 'active'), [], { ranges: [{ from: 0, to: k - 1, label: `sum ${sum}` }] }),
      { line: 1, vars: { sum, best } },
    );
    for (let i = k; i < a.length; i++) {
      sum += a[i] - a[i - k];
      if (sum > best) {
        best = sum;
        bestI = i - k + 1;
      }
      rec.snap(
        'UPDATE',
        `Add ${a[i]}, drop ${a[i - k]} → sum ${sum}; best ${best}.`,
        arr(
          a,
          [...range(i - k + 1, i, 'active'), { index: i, role: 'write' }, { index: i - k, role: 'muted' }],
          [],
          { ranges: [{ from: i - k + 1, to: i, label: `sum ${sum}` }] },
        ),
        { line: 3, vars: { i, sum, best } },
      );
    }
    return rec.finish(
      best,
      `Best window sum ${best} starting at ${bestI}.`,
      arr(a, range(bestI, bestI + k - 1, 'found')),
      4,
    );
  },
};

export const prefixSums: AlgorithmDef = {
  id: 'pattern-prefix-sums',
  name: 'Prefix sums: range sum query',
  category: 'patterns',
  visual: 'array',
  summary: 'Precompute P[i] = a[0] + … + a[i-1]; any range sum is P[r+1] − P[l] in O(1).',
  pseudocode: ['P[0] = 0', 'for i in 0..n-1: P[i + 1] = P[i] + a[i]', 'sum(l, r) = P[r + 1] - P[l]'],
  complexity: {
    time: {
      best: 'O(n) build, O(1) query',
      average: 'O(n) build, O(1) query',
      worst: 'O(n) build, O(1) query',
    },
    space: 'O(n)',
  },
  inputs: [
    { key: 'values', label: 'Array', type: 'numbers' },
    { key: 'l', label: 'l', type: 'number' },
    { key: 'r', label: 'r', type: 'number' },
  ],
  defaultInput: { values: [3, 1, 4, 1, 5, 9, 2, 6], l: 2, r: 5 },
  run(input) {
    const a = nums(input, 'values', { min: 1 });
    const l = num(input, 'l', { min: 0, max: a.length - 1 });
    const r = num(input, 'r', { min: l, max: a.length - 1 });
    const P: (number | null)[] = new Array(a.length + 1).fill(null);
    P[0] = 0;
    const rec = new TraceRecorder<ArrayState>('pattern-prefix-sums', { values: a, l, r });
    const view = (hl: Highlight[] = [], ph: Highlight[] = []) =>
      arr(a, hl, [], { aux: [{ label: 'P (prefix)', values: [...P], highlights: ph }] });
    rec.snap('INIT', 'P[0] = 0.', view([], [{ index: 0, role: 'write' }]), { line: 1 });
    a.forEach((x, i) => {
      P[i + 1] = P[i]! + x;
      rec.snap(
        'WRITE',
        `P[${i + 1}] = P[${i}] + a[${i}] = ${P[i + 1]}.`,
        view(
          [{ index: i, role: 'active' }],
          [
            { index: i + 1, role: 'write' },
            { index: i, role: 'compare' },
          ],
        ),
        { line: 2, vars: { i } },
      );
    });
    const ans = P[r + 1]! - P[l]!;
    rec.snap(
      'READ',
      `sum(${l}, ${r}) = P[${r + 1}] − P[${l}] = ${P[r + 1]} − ${P[l]} = ${ans}.`,
      view(range(l, r, 'found'), [
        { index: r + 1, role: 'found' },
        { index: l, role: 'found' },
      ]),
      { line: 3 },
    );
    return rec.finish(ans, `Range sum = ${ans}.`, view(range(l, r, 'found')), 3);
  },
};

export const answerSpaceSearch: AlgorithmDef = {
  id: 'pattern-binary-search-answer',
  name: 'Binary search on the answer (eating speed)',
  category: 'patterns',
  visual: 'array',
  summary:
    'The minimum speed that finishes all piles within h hours: feasibility is monotonic, so binary search the speed.',
  pseudocode: [
    'lo = 1, hi = max(piles)',
    'while lo < hi:',
    '    mid = (lo + hi) / 2',
    '    hours = Σ ceil(p / mid)',
    '    if hours <= h: hi = mid else: lo = mid + 1',
    'return lo',
  ],
  complexity: { time: { best: 'O(n log m)', average: 'O(n log m)', worst: 'O(n log m)' }, space: 'O(1)' },
  inputs: [
    { key: 'values', label: 'Piles', type: 'numbers', maxLength: 10 },
    { key: 'h', label: 'Hours', type: 'number', min: 1, max: 100 },
  ],
  defaultInput: { values: [3, 6, 7, 11], h: 8 },
  run(input) {
    const piles = nums(input, 'values', { min: 1, max: 10 });
    if (piles.some((p) => p <= 0)) throw new InputError('Piles must be positive.');
    const h = num(input, 'h', { min: piles.length, max: 100 });
    const max = Math.max(...piles);
    const speeds = Array.from({ length: Math.min(max, 24) }, (_, i) => i + 1);
    const rec = new TraceRecorder<ArrayState>('pattern-binary-search-answer', { values: piles, h });
    let lo = 1;
    let hi = max;
    const ptr = (mid?: number) =>
      [lo, hi, ...(mid ? [mid] : [])].every((x) => x <= speeds.length)
        ? [
            { name: 'lo', at: lo - 1 },
            { name: 'hi', at: hi - 1 },
            ...(mid ? [{ name: 'mid', at: mid - 1 }] : []),
          ]
        : [];
    const view = (hl: Highlight[] = [], mid?: number) =>
      arr(speeds, hl, ptr(mid), { aux: [{ label: 'piles', values: piles }] });
    rec.snap('INIT', `Candidate speeds 1..${max}.`, view(), { line: 1, vars: { lo, hi } });
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const hours = piles.reduce((s, p) => s + Math.ceil(p / mid), 0);
      rec.snap(
        'COMPARE',
        `Speed ${mid} needs ${hours} hour(s) — ${hours <= h ? 'feasible' : 'too slow'}.`,
        view([{ index: mid - 1, role: hours <= h ? 'found' : 'error' }], mid),
        { line: 4, vars: { lo, hi, mid, hours } },
      );
      if (hours <= h) hi = mid;
      else lo = mid + 1;
      rec.snap('POINTER_MOVE', `Range is now [${lo}, ${hi}].`, view(), { line: 5, vars: { lo, hi } });
    }
    return rec.finish(lo, `Minimum speed = ${lo}.`, view([{ index: lo - 1, role: 'found' }]), 6);
  },
};

export const mergeIntervals: AlgorithmDef = {
  id: 'pattern-merge-intervals',
  name: 'Greedy: merge intervals',
  category: 'patterns',
  visual: 'array',
  summary: 'Sort by start; extend the last merged interval when the next one overlaps.',
  pseudocode: [
    'sort intervals by start',
    'out = [first]',
    'for [s, e] in rest:',
    '    if s <= out.last.end: out.last.end = max(out.last.end, e)',
    '    else: out.append([s, e])',
  ],
  complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
  inputs: [{ key: 'intervals', label: 'Intervals (1-3, 2-6, …)', type: 'text', maxLength: 120 }],
  defaultInput: { intervals: '1-3, 8-10, 2-6, 15-18, 17-20' },
  run(input) {
    const parts = str(input, 'intervals', 120)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 10) throw new InputError('At most 10 intervals.');
    const iv = parts.map((p) => {
      const m = /^(-?\d{1,4})\s*-\s*(-?\d{1,4})$/.exec(p);
      if (!m || Number(m[1]) > Number(m[2]))
        throw new InputError(`Bad interval "${p}" (use start-end with start ≤ end).`);
      return [Number(m[1]), Number(m[2])] as [number, number];
    });
    const fmt = (x: [number, number]) => `${x[0]}–${x[1]}`;
    const rec = new TraceRecorder<ArrayState>('pattern-merge-intervals', { intervals: input.intervals });
    rec.snap('INIT', 'Input intervals.', arr(iv.map(fmt)), { line: 1 });
    iv.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    rec.snap('UPDATE', 'Sorted by start.', arr(iv.map(fmt)), { line: 1 });
    const out: [number, number][] = [];
    iv.forEach((x, i) => {
      const lastI = out.length - 1;
      if (out.length && x[0] <= out[lastI][1]) {
        out[lastI][1] = Math.max(out[lastI][1], x[1]);
        rec.snap(
          'MERGE',
          `${fmt(x)} overlaps — extend to ${fmt(out[lastI])}.`,
          arr(iv.map(fmt), [{ index: i, role: 'compare' }], [], {
            aux: [{ label: 'merged', values: out.map(fmt), highlights: [{ index: lastI, role: 'write' }] }],
          }),
          { line: 4 },
        );
      } else {
        out.push([...x]);
        rec.snap(
          'INSERT',
          `${fmt(x)} starts a new interval.`,
          arr(iv.map(fmt), [{ index: i, role: 'active' }], [], {
            aux: [
              {
                label: 'merged',
                values: out.map(fmt),
                highlights: [{ index: out.length - 1, role: 'write' }],
              },
            ],
          }),
          { line: 5 },
        );
      }
    });
    return rec.finish(
      out.map(fmt),
      `Merged: ${out.map(fmt).join(', ')}.`,
      arr(
        out.map(fmt),
        out.map((_, i) => ({ index: i, role: 'found' as const })),
      ),
    );
  },
};

export const slidingWindowMax: AlgorithmDef = {
  id: 'pattern-monotonic-queue',
  name: 'Monotonic queue: sliding window maximum',
  category: 'patterns',
  visual: 'array',
  summary: 'A deque keeps indices of decreasing values; its front is always the current window maximum.',
  pseudocode: [
    'dq = empty deque of indices',
    'for i in 0..n-1:',
    '    pop back while a[back] <= a[i]; push i',
    '    if front <= i - k: pop front',
    '    if i >= k - 1: output a[front]',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(k)' },
  inputs: [
    { key: 'values', label: 'Array', type: 'numbers' },
    { key: 'k', label: 'Window k', type: 'number', min: 1, max: 24 },
  ],
  defaultInput: { values: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
  run(input) {
    const a = nums(input, 'values', { min: 1 });
    const k = num(input, 'k', { min: 1, max: a.length });
    const dq: number[] = [];
    const out: number[] = [];
    const rec = new TraceRecorder<ArrayState>('pattern-monotonic-queue', { values: a, k });
    const view = (i: number, hl: Highlight[] = []) =>
      arr(a, [...range(Math.max(0, i - k + 1), i, 'active'), ...hl], [{ name: 'i', at: i }], {
        aux: [
          { label: 'deque (values)', values: dq.map((j) => a[j]) },
          { label: 'max', values: [...out] },
        ],
      });
    rec.snap('INIT', 'Empty deque.', arr(a), { line: 1 });
    a.forEach((x, i) => {
      while (dq.length && a[dq[dq.length - 1]] <= x) {
        const j = dq.pop()!;
        rec.snap(
          'POP',
          `${a[j]} ≤ ${x}: it can never be a maximum again — pop back.`,
          view(i, [{ index: j, role: 'muted' }]),
          { line: 3, vars: { i } },
        );
      }
      dq.push(i);
      rec.snap('PUSH', `Push ${x}.`, view(i, [{ index: i, role: 'write' }]), { line: 3, vars: { i } });
      if (dq[0] <= i - k) {
        const j = dq.shift()!;
        rec.snap(
          'POP',
          `Front ${a[j]} left the window — pop front.`,
          view(i, [{ index: j, role: 'muted' }]),
          { line: 4, vars: { i } },
        );
      }
      if (i >= k - 1) {
        out.push(a[dq[0]]);
        rec.snap('FOUND', `Window max = ${a[dq[0]]}.`, view(i, [{ index: dq[0], role: 'found' }]), {
          line: 5,
          vars: { i },
        });
      }
    });
    return rec.finish(
      out,
      `Maxima: [${out.join(', ')}].`,
      arr(a, [], [], { aux: [{ label: 'max', values: out }] }),
    );
  },
};

export const numberOfIslands: AlgorithmDef = {
  id: 'pattern-number-of-islands',
  name: 'Number of islands (grid BFS)',
  category: 'patterns',
  visual: 'grid',
  summary: 'Every unvisited land cell starts a flood fill that sinks its whole island.',
  pseudocode: [
    'count = 0',
    'for each cell:',
    "    if cell == '1' and not seen:",
    '        count++; BFS marking connected land as seen',
    'return count',
  ],
  complexity: { time: { best: 'O(R·C)', average: 'O(R·C)', worst: 'O(R·C)' }, space: 'O(R·C)' },
  inputs: [{ key: 'grid', label: 'Rows of 0/1 (comma separated)', type: 'text', maxLength: 60 }],
  defaultInput: { grid: '11000, 11000, 00100, 00011' },
  run(input) {
    const rows = str(input, 'grid', 60)
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    if (!rows.length || rows.some((r) => !/^[01]+$/.test(r) || r.length !== rows[0].length))
      throw new InputError('Rows must be equal-length strings of 0 and 1.');
    if (rows.length > 6 || rows[0].length > 8) throw new InputError('Grid up to 6×8.');
    const cells: (string | null)[][] = rows.map((r) => [...r]);
    const seen = rows.map((r) => new Array(r.length).fill(false));
    let count = 0;
    const rec = new TraceRecorder<GridState>('pattern-number-of-islands', { grid: input.grid });
    const g = (hl: GridState['highlights'] = []) => {
      const base: GridState['highlights'] = [];
      cells.forEach((row, r) =>
        row.forEach((v, c) => {
          if (seen[r][c]) base.push({ r, c, role: 'visited' });
          else if (v === '0') base.push({ r, c, role: 'muted' });
        }),
      );
      return grid(cells, [...base, ...hl]);
    };
    rec.snap('INIT', 'Scan the grid row by row.', g(), { line: 1 });
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[0].length; c++) {
        if (rows[r][c] !== '1' || seen[r][c]) continue;
        count++;
        rec.snap('FOUND', `New island #${count} at (${r}, ${c}).`, g([{ r, c, role: 'found' }]), {
          line: 4,
          vars: { count },
        });
        const q: [number, number][] = [[r, c]];
        seen[r][c] = true;
        while (q.length) {
          const [y, x] = q.shift()!;
          cells[y][x] = String.fromCharCode(64 + count);
          rec.snap(
            'VISIT',
            `Flood (${y}, ${x}) into island ${String.fromCharCode(64 + count)}.`,
            g([{ r: y, c: x, role: 'active' }]),
            { line: 4, vars: { count } },
          );
          for (const [dy, dx] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const ny = y + dy;
            const nx = x + dx;
            if (
              ny >= 0 &&
              nx >= 0 &&
              ny < rows.length &&
              nx < rows[0].length &&
              rows[ny][nx] === '1' &&
              !seen[ny][nx]
            ) {
              seen[ny][nx] = true;
              q.push([ny, nx]);
            }
          }
        }
      }
    return rec.finish(count, `${count} island(s).`, g(), 5);
  },
};

export const kthLargest: AlgorithmDef = {
  id: 'pattern-kth-largest',
  name: 'Kth largest (min-heap of size k)',
  category: 'patterns',
  visual: 'tree',
  summary: 'Keep the k largest values in a min-heap; its root is the kth largest.',
  pseudocode: [
    'heap = empty min-heap',
    'for x in a:',
    '    heap.push(x)',
    '    if heap.size > k: heap.pop()   // drop the smallest',
    'return heap.peek()',
  ],
  complexity: { time: { best: 'O(n log k)', average: 'O(n log k)', worst: 'O(n log k)' }, space: 'O(k)' },
  inputs: [
    { key: 'values', label: 'Array', type: 'numbers', maxLength: 12 },
    { key: 'k', label: 'k', type: 'number', min: 1, max: 7 },
  ],
  defaultInput: { values: [3, 2, 1, 5, 6, 4], k: 2 },
  run(input) {
    const a = nums(input, 'values', { min: 1, max: 12 });
    const k = num(input, 'k', { min: 1, max: Math.min(7, a.length) });
    const h: number[] = [];
    const up = (i: number) => {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (h[p] <= h[i]) break;
        [h[p], h[i]] = [h[i], h[p]];
        i = p;
      }
    };
    const down = (i: number) => {
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < h.length && h[l] < h[m]) m = l;
        if (r < h.length && h[r] < h[m]) m = r;
        if (m === i) return;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    };
    const rec = new TraceRecorder<TreeState>('pattern-kth-largest', { values: a, k });
    const st = (roles: Record<number, 'active' | 'found' | 'error' | 'write'> = {}): TreeState => ({
      ...heapState(h, roles),
      output: { label: 'input', tokens: a.map(String) },
    });
    rec.snap('INIT', `Keep a min-heap of the ${k} largest values seen.`, st(), { line: 1 });
    for (const x of a) {
      h.push(x);
      up(h.length - 1);
      rec.snap('PUSH', `Push ${x}.`, st({ [h.indexOf(x)]: 'write' }), { line: 3 });
      if (h.length > k) {
        const small = h[0];
        h[0] = h[h.length - 1];
        h.pop();
        down(0);
        rec.snap('POP', `Heap exceeds k — drop the smallest (${small}).`, st(), { line: 4 });
      }
    }
    return rec.finish(h[0], `The ${k}th largest value is ${h[0]}.`, st({ 0: 'found' }), 5);
  },
};

export const PATTERN_ALGORITHMS: AlgorithmDef[] = [
  twoSum,
  pairSumSorted,
  longestUniqueSubstring,
  maxSumWindow,
  prefixSums,
  answerSpaceSearch,
  mergeIntervals,
  slidingWindowMax,
  numberOfIslands,
  kthLargest,
];
