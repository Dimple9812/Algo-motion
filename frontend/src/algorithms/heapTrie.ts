import { InputError, TraceRecorder } from '@/engine/recorder';
import type { Highlight, Role, TreeNodeView, TreeState } from '@/engine/types';
import type { AlgorithmDef } from './types';
import { num, nums, randomInts, str, words } from './util';

// ---------------------------------------------------------------- Heaps

type HeapKind = 'min' | 'max';

/** Render an array-backed heap as both a tree and its array. Node ids are array indices. */
export function heapState(
  a: number[],
  roles: Record<number, Role> = {},
  extraHl: Highlight[] = [],
  sortedFrom = a.length,
): TreeState {
  const live = a.slice(0, sortedFrom);
  const nodes: TreeNodeView[] = live.map((v, i) => ({
    id: `h${i}`,
    label: String(v),
    children: [
      2 * i + 1 < live.length ? `h${2 * i + 1}` : null,
      2 * i + 2 < live.length ? `h${2 * i + 2}` : null,
    ],
    badge: `[${i}]`,
  }));
  const nodeRoles: Record<string, Role> = {};
  Object.entries(roles).forEach(([i, r]) => (nodeRoles[`h${i}`] = r));
  const arrHl: Highlight[] = [
    ...Object.entries(roles).map(([i, role]) => ({ index: Number(i), role })),
    ...extraHl,
    ...a.slice(sortedFrom).map((_, k) => ({ index: sortedFrom + k, role: 'sorted' as const })),
  ];
  return {
    kind: 'tree',
    variant: 'heap',
    nodes,
    root: live.length ? 'h0' : null,
    nodeRoles,
    pointers: [],
    array: [...a],
    arrayHighlights: arrHl,
  };
}

const better = (kind: HeapKind, x: number, y: number) => (kind === 'min' ? x < y : x > y);

function siftUp(a: number[], i: number, kind: HeapKind, rec: TraceRecorder<TreeState>, line: number) {
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    rec.snap(
      'COMPARE',
      `Compare ${a[i]} with parent ${a[p]} (index ${p}).`,
      heapState(a, { [i]: 'active', [p]: 'compare' }),
      { line, vars: { i, parent: p } },
    );
    if (!better(kind, a[i], a[p])) break;
    [a[i], a[p]] = [a[p], a[i]];
    rec.snap(
      'SWAP',
      `${kind}-heap property violated — swap with parent.`,
      heapState(a, { [p]: 'swap', [i]: 'swap' }),
      { line, vars: { i: p } },
    );
    i = p;
  }
}

function siftDown(
  a: number[],
  i: number,
  size: number,
  kind: HeapKind,
  rec: TraceRecorder<TreeState>,
  line: number,
  sortedFrom = a.length,
) {
  for (;;) {
    const l = 2 * i + 1;
    const r = l + 1;
    let best = i;
    if (l < size && better(kind, a[l], a[best])) best = l;
    if (r < size && better(kind, a[r], a[best])) best = r;
    const roles: Record<number, Role> = { [i]: 'active' };
    if (l < size) roles[l] = 'compare';
    if (r < size) roles[r] = 'compare';
    rec.snap(
      'COMPARE',
      `Children of ${a[i]}: ${l < size ? a[l] : '—'}, ${r < size ? a[r] : '—'}. ${best === i ? 'Heap property holds.' : `Swap with ${a[best]}.`}`,
      heapState(a, roles, [], sortedFrom),
      { line, vars: { i, left: l, right: r } },
    );
    if (best === i) return;
    [a[i], a[best]] = [a[best], a[i]];
    rec.snap('SWAP', `Swap ${a[best]} down.`, heapState(a, { [i]: 'swap', [best]: 'swap' }, [], sortedFrom), {
      line,
      vars: { i: best },
    });
    i = best;
  }
}

const KIND_IN = {
  key: 'kind',
  label: 'Heap type',
  type: 'select' as const,
  options: [
    { value: 'min', label: 'Min heap' },
    { value: 'max', label: 'Max heap' },
  ],
};
const kindOf = (v: unknown): HeapKind => {
  if (v !== 'min' && v !== 'max') throw new InputError('Heap type must be min or max');
  return v;
};
const LOG = { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' };

export function buildHeapSilently(values: number[], kind: HeapKind): number[] {
  const a = [...values];
  const down = (i: number) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let b = i;
      if (l < a.length && better(kind, a[l], a[b])) b = l;
      if (r < a.length && better(kind, a[r], a[b])) b = r;
      if (b === i) return;
      [a[i], a[b]] = [a[b], a[i]];
      i = b;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) down(i);
  return a;
}

export function isHeap(a: number[], kind: HeapKind): boolean {
  for (let i = 1; i < a.length; i++) if (better(kind, a[i], a[Math.floor((i - 1) / 2)])) return false;
  return true;
}

export const heapInsert: AlgorithmDef = {
  id: 'heap-insert',
  name: 'Heap insert (sift up)',
  category: 'heaps',
  visual: 'tree',
  summary: 'Append at the next free leaf, then swap upward while it beats its parent.',
  pseudocode: [
    'a.append(x); i = n - 1',
    'while i > 0 and a[i] beats a[parent(i)]:',
    '    swap a[i], a[parent(i)]; i = parent(i)',
  ],
  complexity: { time: LOG, space: 'O(1)' },
  inputs: [
    KIND_IN,
    { key: 'values', label: 'Existing heap values', type: 'numbers', maxLength: 14 },
    { key: 'value', label: 'Insert', type: 'number' },
  ],
  defaultInput: { kind: 'min', values: [3, 9, 5, 12, 10, 8], value: 2 },
  randomInput: (seed) => ({ kind: 'min', values: randomInts(seed, 7), value: 1 + (seed % 50) }),
  run(input) {
    const kind = kindOf(input.kind);
    const a = buildHeapSilently(nums(input, 'values', { max: 14 }), kind);
    const x = num(input, 'value', { min: -999, max: 999 });
    const rec = new TraceRecorder<TreeState>('heap-insert', { kind, values: input.values, value: x });
    rec.snap('INIT', `A valid ${kind}-heap (tree + array).`, heapState(a), { line: 1 });
    a.push(x);
    rec.snap('INSERT', `Append ${x} at index ${a.length - 1}.`, heapState(a, { [a.length - 1]: 'write' }), {
      line: 1,
    });
    siftUp(a, a.length - 1, kind, rec, 2);
    return rec.finish(a, `Heap: [${a.join(', ')}].`, heapState(a));
  },
};

export const heapExtract: AlgorithmDef = {
  id: 'heap-extract',
  name: 'Extract min / max (sift down)',
  category: 'heaps',
  visual: 'tree',
  summary: 'Remove the root, move the last leaf to the root, and sift it down.',
  pseudocode: [
    'top = a[0]',
    'a[0] = a.pop()',
    'siftDown(0): swap with the better child while it beats the node',
    'return top',
  ],
  complexity: { time: LOG, space: 'O(1)' },
  inputs: [KIND_IN, { key: 'values', label: 'Heap values', type: 'numbers', maxLength: 15 }],
  defaultInput: { kind: 'max', values: [50, 30, 40, 10, 20, 35, 25] },
  run(input) {
    const kind = kindOf(input.kind);
    const a = buildHeapSilently(nums(input, 'values', { max: 15 }), kind);
    const rec = new TraceRecorder<TreeState>('heap-extract', { kind, values: input.values });
    rec.snap('INIT', `A valid ${kind}-heap.`, heapState(a), { line: 1 });
    if (!a.length) {
      rec.snap('UNDERFLOW', 'Heap is empty.', heapState(a), { line: 1 });
      return rec.finish(null, 'Nothing to extract.', heapState(a));
    }
    const top = a[0];
    rec.snap('PEEK', `Root ${top} is the ${kind}.`, heapState(a, { 0: 'found' }), { line: 1, vars: { top } });
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      rec.snap('WRITE', `Move last leaf ${last} to the root.`, heapState(a, { 0: 'write' }), { line: 2 });
      siftDown(a, 0, a.length, kind, rec, 3);
    }
    return rec.finish(top, `Extracted ${top}. Heap: [${a.join(', ')}].`, heapState(a), 4);
  },
};

export const heapPeek: AlgorithmDef = {
  id: 'heap-peek',
  name: 'Peek',
  category: 'heaps',
  visual: 'tree',
  summary: 'The best element is always at index 0.',
  pseudocode: ['if empty: underflow', 'return a[0]'],
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
  inputs: [KIND_IN, { key: 'values', label: 'Heap values', type: 'numbers', maxLength: 15 }],
  defaultInput: { kind: 'min', values: [7, 3, 9, 1, 5] },
  run(input) {
    const kind = kindOf(input.kind);
    const a = buildHeapSilently(nums(input, 'values', { max: 15 }), kind);
    const rec = new TraceRecorder<TreeState>('heap-peek', { kind, values: input.values });
    rec.snap('INIT', `A ${kind}-heap.`, heapState(a), { line: 1 });
    if (!a.length) return rec.finish(null, 'Empty heap.', heapState(a), 1);
    rec.snap('PEEK', `Peek → ${a[0]}.`, heapState(a, { 0: 'found' }), { line: 2 });
    return rec.finish(a[0], `${kind} = ${a[0]}.`, heapState(a, { 0: 'found' }), 2);
  },
};

export const buildHeap: AlgorithmDef = {
  id: 'heap-build',
  name: 'Build heap (heapify)',
  category: 'heaps',
  visual: 'tree',
  summary: 'Sift down every internal node from the last parent to the root — O(n) overall.',
  pseudocode: ['for i from n/2 - 1 down to 0:', '    siftDown(i)'],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  inputs: [KIND_IN, { key: 'values', label: 'Unordered values', type: 'numbers', maxLength: 15 }],
  defaultInput: { kind: 'max', values: [4, 10, 3, 5, 1, 8, 9] },
  randomInput: (seed) => ({ kind: 'max', values: randomInts(seed, 9) }),
  run(input) {
    const kind = kindOf(input.kind);
    const a = nums(input, 'values', { max: 15 });
    const rec = new TraceRecorder<TreeState>('heap-build', { kind, values: a });
    rec.snap('INIT', 'Unordered array viewed as a complete binary tree.', heapState(a), { line: 1 });
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
      rec.snap(
        'HEAPIFY',
        `Heapify subtree rooted at index ${i} (${a[i]}).`,
        heapState(a, { [i]: 'active' }),
        { line: 1, vars: { i } },
      );
      siftDown(a, i, a.length, kind, rec, 2);
    }
    return rec.finish(a, `Valid ${kind}-heap: [${a.join(', ')}].`, heapState(a));
  },
};

export const heapSortTree: AlgorithmDef = {
  id: 'heap-sort-tree',
  name: 'Heap sort (tree view)',
  category: 'heaps',
  visual: 'tree',
  summary: 'Build a max-heap, then repeatedly move the root to the sorted tail of the array.',
  pseudocode: [
    'buildMaxHeap(a)',
    'for end from n - 1 down to 1:',
    '    swap a[0], a[end]',
    '    siftDown(0, size = end)',
  ],
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    stable: false,
    inPlace: true,
  },
  inputs: [{ key: 'values', label: 'Array', type: 'numbers', maxLength: 12 }],
  defaultInput: { values: [4, 10, 3, 5, 1, 8] },
  run(input) {
    const a = nums(input, 'values', { max: 12 });
    const rec = new TraceRecorder<TreeState>('heap-sort-tree', { values: a });
    rec.snap('INIT', 'Build a max-heap first.', heapState(a), { line: 1 });
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) siftDown(a, i, a.length, 'max', rec, 1);
    for (let end = a.length - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      rec.snap(
        'SWAP',
        `Move max ${a[end]} to index ${end}; it leaves the heap.`,
        heapState(a, { 0: 'swap' }, [], end),
        { line: 3, vars: { end } },
      );
      siftDown(a, 0, end, 'max', rec, 4, end);
    }
    return rec.finish(a, `Sorted: [${a.join(', ')}].`, heapState(a, {}, [], 0));
  },
};

// ---------------------------------------------------------------- Trie

interface TrieNode {
  id: string;
  children: Map<string, string>;
  terminal: boolean;
}

export class Trie {
  nodes = new Map<string, TrieNode>();
  private seq = 0;
  root: string;
  constructor() {
    this.root = this.make();
  }
  private make(): string {
    const id = `r${this.seq++}`;
    this.nodes.set(id, { id, children: new Map(), terminal: false });
    return id;
  }
  child(id: string, ch: string): string | undefined {
    return this.nodes.get(id)!.children.get(ch);
  }
  addChild(id: string, ch: string): string {
    const c = this.make();
    this.nodes.get(id)!.children.set(ch, c);
    return c;
  }
  words(): string[] {
    const out: string[] = [];
    const go = (id: string, prefix: string) => {
      const n = this.nodes.get(id)!;
      if (n.terminal) out.push(prefix);
      [...n.children.entries()].sort().forEach(([ch, c]) => go(c, prefix + ch));
    };
    go(this.root, '');
    return out;
  }
  state(roles: Record<string, Role> = {}, output?: string[]): TreeState {
    const nodes: TreeNodeView[] = [];
    const go = (id: string, label: string) => {
      const n = this.nodes.get(id)!;
      const entries = [...n.children.entries()].sort(([a], [b]) => a.localeCompare(b));
      const shared = entries.length > 1;
      nodes.push({
        id,
        label: id === this.root ? 'root' : label,
        children: entries.map(([, c]) => c),
        edgeLabels: entries.map(([ch]) => ch),
        terminal: n.terminal,
        badge: shared && id !== this.root ? 'shared' : undefined,
      });
      entries.forEach(([ch, c]) => go(c, ch));
    };
    go(this.root, '');
    return {
      kind: 'tree',
      variant: 'trie',
      nodes,
      root: this.root,
      nodeRoles: roles,
      pointers: [],
      output: output ? { label: 'words', tokens: output } : undefined,
    };
  }
}

function buildTrie(list: string[]): Trie {
  const t = new Trie();
  for (const w of list) {
    let cur = t.root;
    for (const ch of w) cur = t.child(cur, ch) ?? t.addChild(cur, ch);
    t.nodes.get(cur)!.terminal = true;
  }
  return t;
}

const WORDS_IN = { key: 'words', label: 'Words', type: 'words' as const, maxLength: 8 };

export const trieInsert: AlgorithmDef = {
  id: 'trie-insert',
  name: 'Trie insert words',
  category: 'tries',
  visual: 'tree',
  summary: 'Follow existing edges for shared prefixes and create new nodes only for new characters.',
  pseudocode: [
    'node = root',
    'for ch in word:',
    '    if ch not in node.children: create child',
    '    node = node.children[ch]',
    'node.isWord = true',
  ],
  complexity: { time: { best: 'O(L)', average: 'O(L)', worst: 'O(L)' }, space: 'O(total characters)' },
  inputs: [WORDS_IN],
  defaultInput: { words: ['car', 'cart', 'care', 'cat', 'dog', 'do'] },
  run(input) {
    const list = words(input, 'words');
    const t = new Trie();
    const rec = new TraceRecorder<TreeState>('trie-insert', { words: list });
    rec.snap('INIT', 'Start with an empty root.', t.state(), { line: 1 });
    for (const w of list) {
      let cur = t.root;
      for (let i = 0; i < w.length; i++) {
        const ch = w[i];
        const existing = t.child(cur, ch);
        if (existing) {
          cur = existing;
          rec.snap(
            'POINTER_MOVE',
            `"${w}": '${ch}' already exists — reuse the shared prefix "${w.slice(0, i + 1)}".`,
            t.state({ [cur]: 'visited' }),
            { line: 4, vars: { word: w, ch } },
          );
        } else {
          cur = t.addChild(cur, ch);
          rec.snap('INSERT', `"${w}": create node for '${ch}'.`, t.state({ [cur]: 'write' }), {
            line: 3,
            vars: { word: w, ch },
          });
        }
      }
      t.nodes.get(cur)!.terminal = true;
      rec.snap('UPDATE', `Mark the end of "${w}".`, t.state({ [cur]: 'found' }), {
        line: 5,
        vars: { word: w },
      });
    }
    return rec.finish(t.words(), `Trie stores: ${t.words().join(', ')}.`, t.state({}, t.words()));
  },
};

function trieQuery(kind: 'search' | 'prefix'): AlgorithmDef {
  const id = kind === 'search' ? 'trie-search' : 'trie-prefix';
  return {
    id,
    name: kind === 'search' ? 'Trie search word' : 'Trie starts-with prefix',
    category: 'tries',
    visual: 'tree',
    summary:
      kind === 'search'
        ? 'Walk the characters; the word exists only if the last node is marked as a word end.'
        : 'Walk the characters; any surviving path means some word has this prefix.',
    pseudocode: [
      'node = root',
      'for ch in query:',
      '    if ch not in node.children: return false',
      '    node = node.children[ch]',
      kind === 'search' ? 'return node.isWord' : 'return true',
    ],
    complexity: { time: { best: 'O(1)', average: 'O(L)', worst: 'O(L)' }, space: 'O(1)' },
    inputs: [
      WORDS_IN,
      { key: 'query', label: kind === 'search' ? 'Word' : 'Prefix', type: 'text', maxLength: 12 },
    ],
    defaultInput: { words: ['car', 'cart', 'care', 'cat', 'dog'], query: kind === 'search' ? 'care' : 'ca' },
    run(input) {
      const list = words(input, 'words');
      const q = str(input, 'query', 12).toLowerCase();
      if (!/^[a-z]+$/.test(q)) throw new InputError('Query must be letters a–z.');
      const t = buildTrie(list);
      const rec = new TraceRecorder<TreeState>(id, { words: list, query: q });
      rec.snap('INIT', `Trie of [${list.join(', ')}]. Query "${q}".`, t.state(), { line: 1 });
      let cur = t.root;
      const path: Record<string, Role> = {};
      for (const ch of q) {
        const nx = t.child(cur, ch);
        if (!nx) {
          rec.snap(
            'NOT_FOUND',
            `No edge '${ch}' — "${q}" ${kind === 'search' ? 'is not a word' : 'is not a prefix'}.`,
            t.state({ ...path, [cur]: 'error' }),
            { line: 3 },
          );
          return rec.finish(false, 'false', t.state(path), 3);
        }
        path[nx] = 'path';
        cur = nx;
        rec.snap('POINTER_MOVE', `Follow '${ch}'.`, t.state({ ...path, [cur]: 'active' }), { line: 4 });
      }
      const ok = kind === 'search' ? t.nodes.get(cur)!.terminal : true;
      rec.snap(
        ok ? 'FOUND' : 'NOT_FOUND',
        kind === 'search'
          ? ok
            ? `"${q}" is a stored word.`
            : `Path exists but "${q}" is not marked as a word.`
          : `Prefix "${q}" exists.`,
        t.state({ ...path, [cur]: ok ? 'found' : 'error' }),
        { line: 5 },
      );
      return rec.finish(ok, String(ok), t.state({ ...path, [cur]: ok ? 'found' : 'error' }), 5);
    },
  };
}
export const trieSearch = trieQuery('search');
export const triePrefix = trieQuery('prefix');

export const trieDelete: AlgorithmDef = {
  id: 'trie-delete',
  name: 'Trie delete word',
  category: 'tries',
  visual: 'tree',
  summary: 'Unmark the word end, then prune nodes bottom-up that are no longer part of any word.',
  pseudocode: [
    'walk to the last node of word (fail if missing)',
    'node.isWord = false',
    'for nodes from last back to root:',
    '    if node has no children and is not a word end: remove it',
    '    else stop',
  ],
  complexity: { time: { best: 'O(L)', average: 'O(L)', worst: 'O(L)' }, space: 'O(L)' },
  inputs: [WORDS_IN, { key: 'query', label: 'Word to delete', type: 'text', maxLength: 12 }],
  defaultInput: { words: ['car', 'cart', 'care', 'cat'], query: 'cart' },
  run(input) {
    const list = words(input, 'words');
    const q = str(input, 'query', 12).toLowerCase();
    const t = buildTrie(list);
    const rec = new TraceRecorder<TreeState>('trie-delete', { words: list, query: q });
    rec.snap('INIT', `Delete "${q}".`, t.state(), { line: 1 });
    const path: { id: string; ch: string; parent: string }[] = [];
    let cur = t.root;
    for (const ch of q) {
      const nx = t.child(cur, ch);
      if (!nx) {
        rec.snap('NOT_FOUND', `"${q}" is not stored.`, t.state({ [cur]: 'error' }), { line: 1 });
        return rec.finish(t.words(), 'Nothing deleted.', t.state());
      }
      path.push({ id: nx, ch, parent: cur });
      cur = nx;
      rec.snap('POINTER_MOVE', `Follow '${ch}'.`, t.state({ [cur]: 'active' }), { line: 1 });
    }
    if (!t.nodes.get(cur)!.terminal) {
      rec.snap('NOT_FOUND', `"${q}" is only a prefix, not a stored word.`, t.state({ [cur]: 'error' }), {
        line: 1,
      });
      return rec.finish(t.words(), 'Nothing deleted.', t.state());
    }
    t.nodes.get(cur)!.terminal = false;
    rec.snap('UPDATE', 'Unmark the word end.', t.state({ [cur]: 'write' }), { line: 2 });
    for (let i = path.length - 1; i >= 0; i--) {
      const { id, ch, parent } = path[i];
      const n = t.nodes.get(id)!;
      if (n.children.size || n.terminal) {
        rec.snap(
          'COMPARE',
          `Node '${ch}' is still needed by another word — stop pruning.`,
          t.state({ [id]: 'found' }),
          { line: 5 },
        );
        break;
      }
      t.nodes.get(parent)!.children.delete(ch);
      t.nodes.delete(id);
      rec.snap('DELETE', `Prune unused node '${ch}'.`, t.state({ [parent]: 'active' }), { line: 4 });
    }
    return rec.finish(t.words(), `Remaining: ${t.words().join(', ') || 'none'}.`, t.state({}, t.words()));
  },
};

export const HEAP_ALGORITHMS: AlgorithmDef[] = [heapInsert, heapExtract, heapPeek, buildHeap, heapSortTree];
export const TRIE_ALGORITHMS: AlgorithmDef[] = [trieInsert, trieSearch, triePrefix, trieDelete];
