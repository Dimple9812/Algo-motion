import { InputError, TraceRecorder } from '@/engine/recorder';
import type { ArrayState, Highlight, Pointer } from '@/engine/types';
import { arr } from './arrays';
import type { AlgorithmDef, AlgoInput } from './types';
import { nums, randomInts } from './util';

const ARRAY_IN = { key: 'values', label: 'Array', type: 'numbers' as const };
const RANDOM = (seed: number): AlgoInput => ({ values: randomInts(seed, 10) });

/** Working state shared by every sort: values + original positions (for stability checks). */
class SortCtx {
  values: number[];
  order: number[];
  sorted = new Set<number>();
  constructor(
    values: number[],
    readonly rec: TraceRecorder<ArrayState>,
  ) {
    this.values = [...values];
    this.order = values.map((_, i) => i);
  }
  state(hl: Highlight[] = [], ptr: Pointer[] = [], extra: Partial<ArrayState> = {}): ArrayState {
    const sortedHl: Highlight[] = [...this.sorted]
      .filter((i) => !hl.some((h) => h.index === i))
      .map((index) => ({ index, role: 'sorted' }));
    return arr(this.values, [...sortedHl, ...hl], ptr, extra);
  }
  swap(i: number, j: number) {
    [this.values[i], this.values[j]] = [this.values[j], this.values[i]];
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
  }
  result() {
    return { sorted: [...this.values], order: [...this.order] };
  }
  finish(msg: string) {
    this.values.forEach((_, i) => this.sorted.add(i));
    return this.rec.finish(this.result(), msg, this.state());
  }
}

export const bubbleSort: AlgorithmDef = {
  id: 'bubble-sort',
  name: 'Bubble sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Repeatedly swap adjacent out-of-order pairs; the largest value bubbles to the end each pass.',
  pseudocode: [
    'for pass from 0 to n - 2:',
    '    swapped = false',
    '    for i from 0 to n - pass - 2:',
    '        if a[i] > a[i + 1]:',
    '            swap a[i], a[i + 1]; swapped = true',
    '    mark a[n - pass - 1] sorted',
    '    if not swapped: break',
  ],
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [5, 1, 4, 2, 8, 3] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('bubble-sort', { values: v });
    const c = new SortCtx(v, rec);
    const n = v.length;
    rec.snap('INIT', 'Start bubble sort.', c.state(), { line: 1, vars: { n } });
    for (let pass = 0; pass < n - 1; pass++) {
      let swapped = false;
      for (let i = 0; i < n - pass - 1; i++) {
        rec.snap(
          'COMPARE',
          `Compare a[${i}] = ${c.values[i]} and a[${i + 1}] = ${c.values[i + 1]}.`,
          c.state(
            [
              { index: i, role: 'compare' },
              { index: i + 1, role: 'compare' },
            ],
            [{ name: 'i', at: i }],
          ),
          { line: 4, vars: { pass, i, swapped } },
        );
        if (c.values[i] > c.values[i + 1]) {
          c.swap(i, i + 1);
          swapped = true;
          rec.snap(
            'SWAP',
            `Out of order — swap them.`,
            c.state(
              [
                { index: i, role: 'swap' },
                { index: i + 1, role: 'swap' },
              ],
              [{ name: 'i', at: i }],
            ),
            { line: 5, vars: { pass, i, swapped } },
          );
        }
      }
      c.sorted.add(n - pass - 1);
      rec.snap('MARK_SORTED', `${c.values[n - pass - 1]} has reached its final position.`, c.state(), {
        line: 6,
        vars: { pass, swapped },
      });
      if (!swapped) {
        for (let k = 0; k < n; k++) c.sorted.add(k);
        rec.snap('MARK_SORTED', 'No swaps in this pass — the array is already sorted.', c.state(), {
          line: 7,
          vars: { pass, swapped },
        });
        break;
      }
    }
    return c.finish('Bubble sort complete.');
  },
};

export const selectionSort: AlgorithmDef = {
  id: 'selection-sort',
  name: 'Selection sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Find the minimum of the unsorted suffix and swap it to the front.',
  pseudocode: [
    'for i from 0 to n - 2:',
    '    min = i',
    '    for j from i + 1 to n - 1:',
    '        if a[j] < a[min]: min = j',
    '    swap a[i], a[min]',
    '    mark a[i] sorted',
  ],
  complexity: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: false,
    inPlace: true,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [29, 10, 14, 37, 13] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('selection-sort', { values: v });
    const c = new SortCtx(v, rec);
    const n = v.length;
    rec.snap('INIT', 'Start selection sort.', c.state(), { line: 1 });
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      rec.snap(
        'UPDATE',
        `Assume a[${i}] = ${c.values[i]} is the minimum.`,
        c.state(
          [{ index: i, role: 'active' }],
          [
            { name: 'i', at: i },
            { name: 'min', at: min },
          ],
        ),
        { line: 2, vars: { i, min } },
      );
      for (let j = i + 1; j < n; j++) {
        rec.snap(
          'COMPARE',
          `Compare a[${j}] = ${c.values[j]} with current min ${c.values[min]}.`,
          c.state(
            [
              { index: j, role: 'compare' },
              { index: min, role: 'active' },
            ],
            [
              { name: 'i', at: i },
              { name: 'j', at: j },
              { name: 'min', at: min },
            ],
          ),
          { line: 4, vars: { i, j, min } },
        );
        if (c.values[j] < c.values[min]) {
          min = j;
          rec.snap(
            'UPDATE',
            `New minimum ${c.values[min]} at index ${min}.`,
            c.state(
              [{ index: min, role: 'active' }],
              [
                { name: 'i', at: i },
                { name: 'min', at: min },
              ],
            ),
            { line: 4, vars: { i, j, min } },
          );
        }
      }
      if (min !== i) {
        c.swap(i, min);
        rec.snap(
          'SWAP',
          `Swap a[${i}] and a[${min}].`,
          c.state([
            { index: i, role: 'swap' },
            { index: min, role: 'swap' },
          ]),
          { line: 5, vars: { i, min } },
        );
      }
      c.sorted.add(i);
      rec.snap('MARK_SORTED', `a[${i}] = ${c.values[i]} is in place.`, c.state(), { line: 6, vars: { i } });
    }
    return c.finish('Selection sort complete.');
  },
};

export const insertionSort: AlgorithmDef = {
  id: 'insertion-sort',
  name: 'Insertion sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Grow a sorted prefix by inserting each new element into its correct place.',
  pseudocode: [
    'for i from 1 to n - 1:',
    '    key = a[i]; j = i - 1',
    '    while j >= 0 and a[j] > key:',
    '        a[j + 1] = a[j]; j--',
    '    a[j + 1] = key',
  ],
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [12, 11, 13, 5, 6] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('insertion-sort', { values: v });
    const c = new SortCtx(v, rec);
    const n = v.length;
    const prefix = (k: number): Highlight[] =>
      Array.from({ length: k }, (_, x) => ({ index: x, role: 'visited' as const }));
    rec.snap('INIT', 'a[0] alone is a sorted prefix.', c.state(prefix(Math.min(1, n))), { line: 1 });
    for (let i = 1; i < n; i++) {
      const key = c.values[i];
      const keyId = c.order[i];
      let j = i - 1;
      rec.snap(
        'READ',
        `Pick key = ${key}.`,
        c.state([...prefix(i), { index: i, role: 'active' }], [{ name: 'i', at: i }]),
        { line: 2, vars: { i, j, key } },
      );
      while (j >= 0) {
        rec.snap(
          'COMPARE',
          `Is a[${j}] = ${c.values[j]} > key ${key}?`,
          c.state(
            [...prefix(i + 1), { index: j, role: 'compare' }, { index: j + 1, role: 'active' }],
            [{ name: 'j', at: j }],
          ),
          { line: 3, vars: { i, j, key } },
        );
        if (c.values[j] <= key) break;
        c.values[j + 1] = c.values[j];
        c.order[j + 1] = c.order[j];
        c.values[j] = key;
        c.order[j] = keyId;
        rec.snap(
          'SHIFT',
          `Shift ${c.values[j + 1]} right.`,
          c.state(
            [...prefix(i + 1), { index: j + 1, role: 'write' }, { index: j, role: 'active' }],
            [{ name: 'j', at: j }],
          ),
          { line: 4, vars: { i, j, key } },
        );
        j--;
      }
      rec.snap(
        'WRITE',
        `Key ${key} lands at index ${j + 1}.`,
        c.state([...prefix(i + 1), { index: j + 1, role: 'found' }]),
        { line: 5, vars: { i, j, key } },
      );
    }
    return c.finish('Insertion sort complete.');
  },
};

export const mergeSort: AlgorithmDef = {
  id: 'merge-sort',
  name: 'Merge sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Divide the array in half, sort each half recursively, then merge the sorted halves.',
  pseudocode: [
    'mergeSort(lo, hi):',
    '    if lo >= hi: return',
    '    mid = (lo + hi) / 2',
    '    mergeSort(lo, mid); mergeSort(mid + 1, hi)',
    '    copy a[lo..hi] into buffer',
    '    merge buffer halves back into a[lo..hi] (take left on ties)',
  ],
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    inPlace: false,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [38, 27, 43, 3, 9, 82, 10] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('merge-sort', { values: v });
    const c = new SortCtx(v, rec);
    rec.snap('INIT', 'Start merge sort on the whole array.', c.state(), { line: 1 });
    const sort = (lo: number, hi: number, depth: number) => {
      if (lo >= hi) return;
      const mid = Math.floor((lo + hi) / 2);
      rec.snap(
        'PARTITION',
        `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}] (depth ${depth}).`,
        c.state([], [], {
          ranges: [
            { from: lo, to: mid, label: 'left' },
            { from: mid + 1, to: hi, label: 'right' },
          ],
        }),
        { line: 3, vars: { lo, mid, hi, depth } },
      );
      sort(lo, mid, depth + 1);
      sort(mid + 1, hi, depth + 1);
      const buf = c.values.slice(lo, hi + 1);
      const ids = c.order.slice(lo, hi + 1);
      const bufState = (hl: Highlight[] = []) => [
        { label: `buffer [${lo}..${hi}]`, values: buf, highlights: hl },
      ];
      rec.snap(
        'READ',
        `Copy [${lo}..${hi}] into the merge buffer.`,
        c.state([], [], { ranges: [{ from: lo, to: hi, label: 'merge' }], aux: bufState() }),
        { line: 5, vars: { lo, mid, hi } },
      );
      let i = 0;
      let j = mid - lo + 1;
      let k = lo;
      const leftEnd = mid - lo;
      const rightEnd = hi - lo;
      while (i <= leftEnd && j <= rightEnd) {
        rec.snap(
          'COMPARE',
          `Compare left ${buf[i]} with right ${buf[j]}.`,
          c.state([{ index: k, role: 'active' }], [{ name: 'k', at: k }], {
            ranges: [{ from: lo, to: hi, label: 'merge' }],
            aux: bufState([
              { index: i, role: 'compare' },
              { index: j, role: 'compare' },
            ]),
          }),
          { line: 6, vars: { i, j, k } },
        );
        if (buf[i] <= buf[j]) {
          c.values[k] = buf[i];
          c.order[k] = ids[i];
          i++;
        } else {
          c.values[k] = buf[j];
          c.order[k] = ids[j];
          j++;
        }
        rec.snap(
          'WRITE',
          `Write ${c.values[k]} to index ${k}.`,
          c.state([{ index: k, role: 'write' }], [{ name: 'k', at: k }], {
            ranges: [{ from: lo, to: hi, label: 'merge' }],
            aux: bufState(),
          }),
          { line: 6, vars: { i, j, k } },
        );
        k++;
      }
      while (i <= leftEnd) {
        c.values[k] = buf[i];
        c.order[k] = ids[i];
        i++;
        rec.snap(
          'WRITE',
          `Copy remaining left value ${c.values[k]} to index ${k}.`,
          c.state([{ index: k, role: 'write' }], [{ name: 'k', at: k }], { aux: bufState() }),
          { line: 6, vars: { i, j, k } },
        );
        k++;
      }
      while (j <= rightEnd) {
        c.values[k] = buf[j];
        c.order[k] = ids[j];
        j++;
        rec.snap(
          'WRITE',
          `Copy remaining right value ${c.values[k]} to index ${k}.`,
          c.state([{ index: k, role: 'write' }], [{ name: 'k', at: k }], { aux: bufState() }),
          { line: 6, vars: { i, j, k } },
        );
        k++;
      }
      rec.snap(
        'MERGE',
        `[${lo}..${hi}] is now sorted.`,
        c.state(Array.from({ length: hi - lo + 1 }, (_, x) => ({ index: lo + x, role: 'visited' as const }))),
        { line: 6, vars: { lo, hi } },
      );
    };
    sort(0, v.length - 1, 0);
    return c.finish('Merge sort complete.');
  },
};

export const quickSort: AlgorithmDef = {
  id: 'quick-sort',
  name: 'Quick sort (Lomuto)',
  category: 'sorting',
  visual: 'array',
  summary:
    'Pick the last element as pivot, partition smaller values to its left, then recurse on both sides.',
  pseudocode: [
    'quickSort(lo, hi):',
    '    if lo >= hi: return',
    '    pivot = a[hi]; i = lo',
    '    for j from lo to hi - 1:',
    '        if a[j] < pivot: swap a[i], a[j]; i++',
    '    swap a[i], a[hi]   // pivot in final place',
    '    quickSort(lo, i - 1); quickSort(i + 1, hi)',
  ],
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n) average stack',
    stable: false,
    inPlace: true,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [10, 80, 30, 90, 40, 50, 70] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('quick-sort', { values: v });
    const c = new SortCtx(v, rec);
    rec.snap('INIT', 'Start quick sort.', c.state(), { line: 1 });
    const qs = (lo: number, hi: number) => {
      if (lo > hi) return;
      if (lo === hi) {
        c.sorted.add(lo);
        rec.snap('MARK_SORTED', `Single element a[${lo}] is in place.`, c.state(), {
          line: 2,
          vars: { lo, hi },
        });
        return;
      }
      const pivot = c.values[hi];
      let i = lo;
      const rng = { ranges: [{ from: lo, to: hi, label: 'partition' }] };
      rec.snap(
        'PARTITION',
        `Partition [${lo}..${hi}] around pivot ${pivot}.`,
        c.state([{ index: hi, role: 'pivot' }], [{ name: 'i', at: i }], rng),
        { line: 3, vars: { lo, hi, pivot, i } },
      );
      for (let j = lo; j < hi; j++) {
        rec.snap(
          'COMPARE',
          `Is a[${j}] = ${c.values[j]} < pivot ${pivot}?`,
          c.state(
            [
              { index: hi, role: 'pivot' },
              { index: j, role: 'compare' },
            ],
            [
              { name: 'i', at: i },
              { name: 'j', at: j },
            ],
            rng,
          ),
          { line: 5, vars: { i, j, pivot } },
        );
        if (c.values[j] < pivot) {
          if (i !== j) {
            c.swap(i, j);
            rec.snap(
              'SWAP',
              `Yes — swap a[${i}] and a[${j}].`,
              c.state(
                [
                  { index: hi, role: 'pivot' },
                  { index: i, role: 'swap' },
                  { index: j, role: 'swap' },
                ],
                [
                  { name: 'i', at: i },
                  { name: 'j', at: j },
                ],
                rng,
              ),
              { line: 5, vars: { i, j, pivot } },
            );
          }
          i++;
          rec.snap(
            'POINTER_MOVE',
            `Advance i to ${i}.`,
            c.state(
              [{ index: hi, role: 'pivot' }],
              [
                { name: 'i', at: i },
                { name: 'j', at: j },
              ],
              rng,
            ),
            { line: 5, vars: { i, j, pivot } },
          );
        }
      }
      if (i !== hi) c.swap(i, hi);
      c.sorted.add(i);
      rec.snap(
        'SWAP',
        `Place pivot ${pivot} at its final index ${i}.`,
        c.state([{ index: i, role: 'pivot' }], [{ name: 'i', at: i }], rng),
        { line: 6, vars: { i, pivot } },
      );
      qs(lo, i - 1);
      qs(i + 1, hi);
    };
    qs(0, v.length - 1);
    return c.finish('Quick sort complete.');
  },
};

export const heapSort: AlgorithmDef = {
  id: 'heap-sort',
  name: 'Heap sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Build a max-heap, then repeatedly swap the root to the end and sift down.',
  pseudocode: [
    'for i from n/2 - 1 down to 0: siftDown(i, n)',
    'for end from n - 1 down to 1:',
    '    swap a[0], a[end]   // max to the end',
    '    siftDown(0, end)',
    'siftDown(i, size): pick largest of i, 2i+1, 2i+2;',
    '    if largest != i: swap and continue from largest',
  ],
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    stable: false,
    inPlace: true,
  },
  inputs: [ARRAY_IN],
  defaultInput: { values: [4, 10, 3, 5, 1, 8] },
  randomInput: RANDOM,
  run(input) {
    const v = nums(input, 'values');
    const rec = new TraceRecorder<ArrayState>('heap-sort', { values: v });
    const c = new SortCtx(v, rec);
    const n = v.length;
    const sift = (start: number, size: number) => {
      let i = start;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let largest = i;
        const hl: Highlight[] = [{ index: i, role: 'active' }];
        if (l < size) hl.push({ index: l, role: 'compare' });
        if (r < size) hl.push({ index: r, role: 'compare' });
        if (l < size && c.values[l] > c.values[largest]) largest = l;
        if (r < size && c.values[r] > c.values[largest]) largest = r;
        rec.snap(
          'COMPARE',
          `Compare node ${c.values[i]} with its children; largest is ${c.values[largest]}.`,
          c.state(hl, [{ name: 'i', at: i }], { ranges: [{ from: 0, to: size - 1, label: 'heap' }] }),
          { line: 5, vars: { i, largest, size } },
        );
        if (largest === i) return;
        c.swap(i, largest);
        rec.snap(
          'SWAP',
          `Swap to restore the heap property.`,
          c.state(
            [
              { index: i, role: 'swap' },
              { index: largest, role: 'swap' },
            ],
            [],
            { ranges: [{ from: 0, to: size - 1, label: 'heap' }] },
          ),
          { line: 6, vars: { i, largest } },
        );
        i = largest;
      }
    };
    rec.snap('INIT', 'Build a max-heap bottom-up.', c.state(), { line: 1 });
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(i, n);
    rec.snap(
      'HEAPIFY',
      `Max-heap built; the maximum ${n ? c.values[0] : ''} is at the root.`,
      c.state(n ? [{ index: 0, role: 'found' }] : []),
      { line: 1 },
    );
    for (let end = n - 1; end > 0; end--) {
      c.swap(0, end);
      c.sorted.add(end);
      rec.snap(
        'SWAP',
        `Move max ${c.values[end]} to index ${end}.`,
        c.state([
          { index: end, role: 'swap' },
          { index: 0, role: 'swap' },
        ]),
        { line: 3, vars: { end } },
      );
      sift(0, end);
    }
    return c.finish('Heap sort complete.');
  },
};

export const countingSort: AlgorithmDef = {
  id: 'counting-sort',
  name: 'Counting sort',
  category: 'sorting',
  visual: 'array',
  summary: 'Count occurrences of each key, prefix-sum the counts, then place values stably from the right.',
  pseudocode: [
    'count[0..k] = 0',
    'for x in a: count[x]++',
    'for v from 1 to k: count[v] += count[v - 1]',
    'for i from n - 1 down to 0:',
    '    out[--count[a[i]]] = a[i]',
    'copy out back into a',
  ],
  complexity: {
    time: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)' },
    space: 'O(n + k)',
    stable: true,
    inPlace: false,
  },
  assumptions: ['Integer keys in the range 0..20 (k = max key).'],
  inputs: [ARRAY_IN],
  defaultInput: { values: [4, 2, 2, 8, 3, 3, 1] },
  randomInput: (seed) => ({ values: randomInts(seed, 10, 0, 9) }),
  run(input) {
    const v = nums(input, 'values');
    if (v.some((x) => x < 0 || x > 20)) throw new InputError('Counting sort visualizer supports keys 0..20.');
    const rec = new TraceRecorder<ArrayState>('counting-sort', { values: v });
    const c = new SortCtx(v, rec);
    const k = v.length ? Math.max(...v) : 0;
    const count = new Array<number>(k + 1).fill(0);
    const out: (number | null)[] = new Array(v.length).fill(null);
    const outIds: number[] = new Array(v.length).fill(-1);
    const aux = (ch: Highlight[] = [], oh: Highlight[] = []) => [
      { label: `count[0..${k}]`, values: [...count], highlights: ch },
      { label: 'output', values: [...out], highlights: oh },
    ];
    rec.snap('INIT', `Allocate count array of size ${k + 1}.`, c.state([], [], { aux: aux() }), {
      line: 1,
      vars: { k },
    });
    v.forEach((x, i) => {
      count[x]++;
      rec.snap(
        'WRITE',
        `a[${i}] = ${x}: count[${x}] becomes ${count[x]}.`,
        c.state([{ index: i, role: 'active' }], [], { aux: aux([{ index: x, role: 'write' }]) }),
        { line: 2, vars: { i, x } },
      );
    });
    for (let x = 1; x <= k; x++) {
      count[x] += count[x - 1];
      rec.snap(
        'WRITE',
        `Prefix sum: count[${x}] = ${count[x]} (values ≤ ${x}).`,
        c.state([], [], {
          aux: aux([
            { index: x, role: 'write' },
            { index: x - 1, role: 'active' },
          ]),
        }),
        { line: 3, vars: { x } },
      );
    }
    for (let i = v.length - 1; i >= 0; i--) {
      const x = c.values[i];
      count[x]--;
      out[count[x]] = x;
      outIds[count[x]] = c.order[i];
      rec.snap(
        'WRITE',
        `Place a[${i}] = ${x} at output[${count[x]}].`,
        c.state([{ index: i, role: 'active' }], [], {
          aux: aux([{ index: x, role: 'active' }], [{ index: count[x], role: 'write' }]),
        }),
        { line: 5, vars: { i, x } },
      );
    }
    c.values = out as number[];
    c.order = outIds;
    rec.snap('WRITE', 'Copy the output back.', c.state([], [], { aux: aux() }), { line: 6 });
    return c.finish('Counting sort complete.');
  },
};

export const radixSort: AlgorithmDef = {
  id: 'radix-sort',
  name: 'Radix sort (LSD)',
  category: 'sorting',
  visual: 'array',
  summary: 'Stable-sort by each decimal digit, least significant first.',
  pseudocode: [
    'exp = 1',
    'while max / exp > 0:',
    '    stable counting sort of a by digit (a[i] / exp) % 10',
    '    exp = exp * 10',
  ],
  complexity: {
    time: { best: 'O(d·(n + 10))', average: 'O(d·(n + 10))', worst: 'O(d·(n + 10))' },
    space: 'O(n + 10)',
    stable: true,
    inPlace: false,
  },
  assumptions: ['Non-negative integers only.'],
  inputs: [ARRAY_IN],
  defaultInput: { values: [170, 45, 75, 90, 802, 24, 2, 66] },
  randomInput: (seed) => ({ values: randomInts(seed, 8, 0, 999) }),
  run(input) {
    const v = nums(input, 'values');
    if (v.some((x) => x < 0))
      throw new InputError('Radix sort visualizer supports non-negative integers only.');
    const rec = new TraceRecorder<ArrayState>('radix-sort', { values: v });
    const c = new SortCtx(v, rec);
    const max = v.length ? Math.max(...v) : 0;
    rec.snap('INIT', `Maximum is ${max}; sort digit by digit.`, c.state(), { line: 1, vars: { max } });
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      const digit = (x: number) => Math.floor(x / exp) % 10;
      const digits = c.values.map(digit);
      rec.snap(
        'READ',
        `Digits at place ${exp}: ${digits.join(', ')}.`,
        c.state([], [], { aux: [{ label: `digit (÷${exp} mod 10)`, values: digits }] }),
        { line: 3, vars: { exp } },
      );
      const count = new Array(10).fill(0);
      c.values.forEach((x) => count[digit(x)]++);
      for (let d = 1; d < 10; d++) count[d] += count[d - 1];
      const out = new Array<number>(c.values.length);
      const ids = new Array<number>(c.values.length);
      for (let i = c.values.length - 1; i >= 0; i--) {
        const d = digit(c.values[i]);
        count[d]--;
        out[count[d]] = c.values[i];
        ids[count[d]] = c.order[i];
      }
      c.values = out;
      c.order = ids;
      rec.snap(
        'WRITE',
        `After stable pass on place ${exp}.`,
        c.state(
          c.values.map((_, i) => ({ index: i, role: 'write' as const })),
          [],
          { aux: [{ label: `digit (÷${exp} mod 10)`, values: c.values.map(digit) }] },
        ),
        { line: 3, vars: { exp } },
      );
      rec.snap('UPDATE', `Move to the next digit.`, c.state(), { line: 4, vars: { exp: exp * 10 } });
    }
    return c.finish('Radix sort complete.');
  },
};

export const SORT_ALGORITHMS: AlgorithmDef[] = [
  bubbleSort,
  selectionSort,
  insertionSort,
  mergeSort,
  quickSort,
  heapSort,
  countingSort,
  radixSort,
];
