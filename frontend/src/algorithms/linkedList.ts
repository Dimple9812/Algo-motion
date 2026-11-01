import { InputError, TraceRecorder } from '@/engine/recorder';
import type { LinkedListState, Pointer, Role } from '@/engine/types';
import type { AlgorithmDef, AlgoInput } from './types';
import { num, nums, randomInts, sortedRandomInts } from './util';

type Variant = LinkedListState['variant'];

/** Educational linked list. Nodes are addressed by stable ids so pointer changes are visible. */
export class LinkedList {
  nodes = new Map<string, number>();
  next: Record<string, string | null> = {};
  prev: Record<string, string | null> = {};
  head: string | null = null;
  tail: string | null = null;
  private seq = 0;

  constructor(
    readonly variant: Variant,
    values: number[] = [],
  ) {
    values.forEach((v) => this.appendRaw(v));
  }

  newNode(value: number): string {
    const id = `n${this.seq++}`;
    this.nodes.set(id, value);
    this.next[id] = null;
    if (this.variant === 'doubly') this.prev[id] = null;
    return id;
  }

  private appendRaw(value: number) {
    const id = this.newNode(value);
    if (!this.head) {
      this.head = this.tail = id;
    } else {
      this.next[this.tail!] = id;
      if (this.variant === 'doubly') this.prev[id] = this.tail;
      this.tail = id;
    }
    if (this.variant === 'circular') this.next[this.tail!] = this.head;
  }

  /** Iterate from head following next pointers, stopping on returning to head or after n steps. */
  ids(): string[] {
    const out: string[] = [];
    let cur = this.head;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      out.push(cur);
      cur = this.next[cur];
    }
    return out;
  }

  values(): number[] {
    return this.ids().map((id) => this.nodes.get(id)!);
  }

  get size(): number {
    return this.ids().length;
  }

  state(
    pointers: Pointer[] = [],
    nodeRoles: Record<string, Role> = {},
    changedEdges: string[] = [],
  ): LinkedListState {
    // Render all live nodes; list order first, then any detached nodes.
    const order = this.ids();
    const detached = [...this.nodes.keys()].filter((id) => !order.includes(id));
    return {
      kind: 'linkedList',
      variant: this.variant,
      nodes: [...order, ...detached].map((id) => ({ id, value: this.nodes.get(id)! })),
      next: { ...this.next },
      prev: this.variant === 'doubly' ? { ...this.prev } : undefined,
      head: this.head,
      tail: this.tail,
      pointers: [
        ...(this.head ? [{ name: 'head', at: this.head }] : []),
        ...(this.tail && this.variant !== 'singly' ? [{ name: 'tail', at: this.tail }] : []),
        ...pointers,
      ],
      nodeRoles,
      changedEdges,
    };
  }

  remove(id: string) {
    this.nodes.delete(id);
    delete this.next[id];
    delete this.prev[id];
  }
}

const VARIANT_IN = {
  key: 'variant',
  label: 'Variant',
  type: 'select' as const,
  options: [
    { value: 'singly', label: 'Singly' },
    { value: 'doubly', label: 'Doubly' },
    { value: 'circular', label: 'Circular' },
  ],
};
const LIST_IN = { key: 'values', label: 'List', type: 'numbers' as const, maxLength: 10 };

function variantOf(input: AlgoInput): Variant {
  const v = String(input.variant ?? 'singly');
  if (v !== 'singly' && v !== 'doubly' && v !== 'circular') throw new InputError('Unknown variant');
  return v;
}

function listValues(input: AlgoInput, key = 'values') {
  return nums(input, key, { max: 10 });
}

const LIST_COMPLEXITY = (best: string, worst: string) => ({
  time: { best, average: worst, worst },
  space: 'O(1)',
});

function opDef(
  id: string,
  name: string,
  summary: string,
  pseudocode: string[],
  complexity: AlgorithmDef['complexity'],
  extraInputs: AlgorithmDef['inputs'],
  defaults: AlgoInput,
  body: (list: LinkedList, rec: TraceRecorder<LinkedListState>, input: AlgoInput) => string,
  withVariant = true,
): AlgorithmDef {
  return {
    id,
    name,
    category: 'linked-lists',
    visual: 'linkedList',
    summary,
    pseudocode,
    complexity,
    inputs: [...(withVariant ? [VARIANT_IN] : []), LIST_IN, ...extraInputs],
    defaultInput: { variant: 'singly', ...defaults },
    randomInput: (seed) => ({ ...defaults, variant: 'singly', values: randomInts(seed, 5) }),
    run(input) {
      const list = new LinkedList(withVariant ? variantOf(input) : 'singly', listValues(input));
      const rec = new TraceRecorder<LinkedListState>(id, { ...input });
      rec.snap('INIT', `Start with ${list.size} node(s).`, list.state(), {
        line: 1,
        vars: { size: list.size },
      });
      const msg = body(list, rec, input);
      return rec.finish(list.values(), msg, list.state());
    },
  };
}

const edge = (a: string | null, b: string | null) => `${a}->${b}`;

export const llInsertHead = opDef(
  'll-insert-head',
  'Insert at head',
  'Create a node whose next points at the old head, then move head.',
  [
    'node = new Node(value)',
    'node.next = head',
    'if doubly and head: head.prev = node',
    'head = node',
    'if circular: tail.next = head',
  ],
  LIST_COMPLEXITY('O(1)', 'O(1)'),
  [{ key: 'value', label: 'Value', type: 'number' }],
  { values: [3, 7, 9], value: 1 },
  (list, rec, input) => {
    const value = num(input, 'value', { min: -999, max: 999 });
    if (list.size >= 12) throw new InputError('List is limited to 12 nodes in the visualizer.');
    const id = list.newNode(value);
    rec.snap('INSERT', `Create node ${value}.`, list.state([{ name: 'node', at: id }], { [id]: 'active' }), {
      line: 1,
    });
    list.next[id] = list.head;
    rec.snap(
      'POINTER_MOVE',
      'node.next → old head.',
      list.state([{ name: 'node', at: id }], { [id]: 'active' }, [edge(id, list.head)]),
      { line: 2 },
    );
    if (list.variant === 'doubly' && list.head) list.prev[list.head] = id;
    list.head = id;
    if (!list.tail) list.tail = id;
    if (list.variant === 'circular') list.next[list.tail] = list.head;
    rec.snap(
      'POINTER_MOVE',
      'head now points at the new node.',
      list.state([], { [id]: 'found' }, [edge(list.tail, list.head)]),
      { line: 4 },
    );
    return `Inserted ${value} at the head in O(1).`;
  },
);

export const llInsertTail = opDef(
  'll-insert-tail',
  'Insert at tail',
  'Walk to the last node (or use the tail pointer) and link the new node after it.',
  [
    'node = new Node(value)',
    'if head is null: head = tail = node; return',
    'tail.next = node',
    'if doubly: node.prev = tail',
    'tail = node',
    'if circular: tail.next = head',
  ],
  LIST_COMPLEXITY('O(1)', 'O(1) with tail pointer'),
  [{ key: 'value', label: 'Value', type: 'number' }],
  { values: [3, 7, 9], value: 12 },
  (list, rec, input) => {
    const value = num(input, 'value', { min: -999, max: 999 });
    if (list.size >= 12) throw new InputError('List is limited to 12 nodes in the visualizer.');
    const id = list.newNode(value);
    rec.snap('INSERT', `Create node ${value}.`, list.state([{ name: 'node', at: id }], { [id]: 'active' }), {
      line: 1,
    });
    if (!list.head) {
      list.head = list.tail = id;
      if (list.variant === 'circular') list.next[id] = id;
      rec.snap(
        'POINTER_MOVE',
        'Empty list: head and tail both point at the node.',
        list.state([], { [id]: 'found' }),
        { line: 2 },
      );
      return `Inserted ${value} into an empty list.`;
    }
    const old = list.tail!;
    list.next[old] = id;
    rec.snap(
      'POINTER_MOVE',
      'old tail.next → node.',
      list.state([{ name: 'node', at: id }], { [id]: 'active', [old]: 'visited' }, [edge(old, id)]),
      { line: 3 },
    );
    if (list.variant === 'doubly') list.prev[id] = old;
    list.tail = id;
    if (list.variant === 'circular') list.next[id] = list.head;
    rec.snap(
      'POINTER_MOVE',
      'tail now points at the new node.',
      list.state([], { [id]: 'found' }, list.variant === 'circular' ? [edge(id, list.head)] : []),
      { line: 5 },
    );
    return `Inserted ${value} at the tail.`;
  },
);

function walkTo(
  list: LinkedList,
  rec: TraceRecorder<LinkedListState>,
  steps: number,
  line: number,
  label = 'curr',
): string {
  let cur = list.head!;
  rec.snap('POINTER_MOVE', `${label} = head.`, list.state([{ name: label, at: cur }], { [cur]: 'active' }), {
    line,
    vars: { i: 0 },
  });
  for (let i = 0; i < steps; i++) {
    cur = list.next[cur]!;
    rec.snap(
      'POINTER_MOVE',
      `Advance ${label} to node ${list.nodes.get(cur)} (position ${i + 1}).`,
      list.state([{ name: label, at: cur }], { [cur]: 'active' }),
      { line, vars: { i: i + 1 } },
    );
  }
  return cur;
}

export const llInsertAt = opDef(
  'll-insert-at',
  'Insert at index',
  'Walk to the node before the index, then splice the new node in.',
  [
    'if index == 0: insert at head',
    'prev = node at index - 1',
    'node.next = prev.next',
    'if doubly: fix prev pointers',
    'prev.next = node',
  ],
  LIST_COMPLEXITY('O(1)', 'O(n)'),
  [
    { key: 'index', label: 'Index', type: 'number' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  { values: [3, 7, 9, 11], index: 2, value: 8 },
  (list, rec, input) => {
    const index = num(input, 'index');
    const value = num(input, 'value', { min: -999, max: 999 });
    const n = list.size;
    if (index < 0 || index > n) {
      rec.snap('ERROR', `Index ${index} is outside 0..${n}.`, list.state(), { line: 1 });
      return 'Insertion rejected.';
    }
    if (list.size >= 12) throw new InputError('List is limited to 12 nodes in the visualizer.');
    const id = list.newNode(value);
    if (index === 0) {
      list.next[id] = list.head;
      if (list.variant === 'doubly' && list.head) list.prev[list.head] = id;
      list.head = id;
      if (!list.tail) list.tail = id;
      if (list.variant === 'circular') list.next[list.tail] = id;
      rec.snap('INSERT', 'Index 0 — new node becomes the head.', list.state([], { [id]: 'found' }), {
        line: 1,
      });
      return `Inserted ${value} at index 0.`;
    }
    const prev = walkTo(list, rec, index - 1, 2, 'prev');
    const after = list.next[prev];
    list.next[id] = list.variant === 'circular' && prev === list.tail ? list.head : after;
    rec.snap(
      'POINTER_MOVE',
      `node.next → ${after ? list.nodes.get(after) : 'null'}.`,
      list.state(
        [
          { name: 'prev', at: prev },
          { name: 'node', at: id },
        ],
        { [id]: 'active', [prev]: 'visited' },
        [edge(id, list.next[id])],
      ),
      { line: 3 },
    );
    if (list.variant === 'doubly') {
      list.prev[id] = prev;
      if (after) list.prev[after] = id;
    }
    list.next[prev] = id;
    if (prev === list.tail) list.tail = id;
    rec.snap(
      'POINTER_MOVE',
      'prev.next → node. The node is now linked.',
      list.state([], { [id]: 'found' }, [edge(prev, id)]),
      { line: 5 },
    );
    return `Inserted ${value} at index ${index}.`;
  },
);

export const llDeleteHead = opDef(
  'll-delete-head',
  'Delete head',
  'Move head to head.next and detach the old head.',
  [
    'if head is null: underflow',
    'old = head',
    'head = head.next',
    'if circular: tail.next = head',
    'free old',
  ],
  LIST_COMPLEXITY('O(1)', 'O(1)'),
  [],
  { values: [3, 7, 9] },
  (list, rec) => {
    if (!list.head) {
      rec.snap('UNDERFLOW', 'The list is empty — nothing to delete.', list.state(), { line: 1 });
      return 'Nothing deleted.';
    }
    const old = list.head;
    rec.snap(
      'POINTER_MOVE',
      `old = head (${list.nodes.get(old)}).`,
      list.state([{ name: 'old', at: old }], { [old]: 'error' }),
      { line: 2 },
    );
    if (list.head === list.tail) {
      list.head = list.tail = null;
    } else {
      list.head = list.next[old];
      if (list.variant === 'doubly' && list.head) list.prev[list.head] = null;
      if (list.variant === 'circular') list.next[list.tail!] = list.head;
    }
    list.next[old] = null;
    rec.snap(
      'POINTER_MOVE',
      'head moves to the next node.',
      list.state([{ name: 'old', at: old }], { [old]: 'error' }),
      { line: 3 },
    );
    const v = list.nodes.get(old);
    list.remove(old);
    rec.snap('DELETE', `Free node ${v}.`, list.state(), { line: 5 });
    return `Deleted head ${v}.`;
  },
);

export const llDeleteTail = opDef(
  'll-delete-tail',
  'Delete tail',
  'Find the node before the tail, make it the new tail, and detach the old tail.',
  [
    'if head is null: underflow',
    'if one node: head = tail = null',
    'prev = node before tail (walk, or tail.prev if doubly)',
    'prev.next = null (or head if circular)',
    'tail = prev',
  ],
  LIST_COMPLEXITY('O(1) doubly', 'O(n) singly'),
  [],
  { values: [3, 7, 9] },
  (list, rec) => {
    if (!list.head) {
      rec.snap('UNDERFLOW', 'The list is empty — nothing to delete.', list.state(), { line: 1 });
      return 'Nothing deleted.';
    }
    const old = list.tail!;
    const v = list.nodes.get(old);
    if (list.head === list.tail) {
      list.head = list.tail = null;
      list.remove(old);
      rec.snap('DELETE', 'Only one node — the list becomes empty.', list.state(), { line: 2 });
      return `Deleted ${v}.`;
    }
    let prev: string;
    if (list.variant === 'doubly') {
      prev = list.prev[old]!;
      rec.snap(
        'POINTER_MOVE',
        'Doubly linked: prev = tail.prev in O(1).',
        list.state([{ name: 'prev', at: prev }], { [old]: 'error', [prev]: 'active' }),
        { line: 3 },
      );
    } else {
      prev = walkTo(list, rec, list.size - 2, 3, 'prev');
    }
    list.next[prev] = list.variant === 'circular' ? list.head : null;
    list.tail = prev;
    list.next[old] = null;
    rec.snap(
      'POINTER_MOVE',
      'prev becomes the new tail.',
      list.state([], { [old]: 'error', [prev]: 'found' }, [edge(prev, list.next[prev])]),
      { line: 5 },
    );
    list.remove(old);
    rec.snap('DELETE', `Free node ${v}.`, list.state(), { line: 5 });
    return `Deleted tail ${v}.`;
  },
);

export const llDeleteAt = opDef(
  'll-delete-at',
  'Delete at index',
  'Walk to the node before the index and bypass the target node.',
  [
    'if index == 0: delete head',
    'prev = node at index - 1',
    'target = prev.next',
    'prev.next = target.next',
    'if doubly: fix prev pointer',
    'free target',
  ],
  LIST_COMPLEXITY('O(1)', 'O(n)'),
  [{ key: 'index', label: 'Index', type: 'number' }],
  { values: [3, 7, 9, 11], index: 2 },
  (list, rec, input) => {
    const index = num(input, 'index');
    const n = list.size;
    if (index < 0 || index >= n) {
      rec.snap('ERROR', `Index ${index} is outside 0..${n - 1}.`, list.state(), { line: 1 });
      return 'Deletion rejected.';
    }
    if (index === 0) {
      const old = list.head!;
      const v = list.nodes.get(old);
      if (list.head === list.tail) list.head = list.tail = null;
      else {
        list.head = list.next[old];
        if (list.variant === 'doubly') list.prev[list.head!] = null;
        if (list.variant === 'circular') list.next[list.tail!] = list.head;
      }
      list.remove(old);
      rec.snap('DELETE', `Removed head ${v}.`, list.state(), { line: 1 });
      return `Deleted ${v} at index 0.`;
    }
    const prev = walkTo(list, rec, index - 1, 2, 'prev');
    const target = list.next[prev]!;
    const v = list.nodes.get(target);
    rec.snap(
      'POINTER_MOVE',
      `target = prev.next (${v}).`,
      list.state(
        [
          { name: 'prev', at: prev },
          { name: 'target', at: target },
        ],
        { [target]: 'error', [prev]: 'active' },
      ),
      { line: 3 },
    );
    const after = list.next[target];
    list.next[prev] = after;
    if (list.variant === 'doubly' && after && after !== list.head) list.prev[after] = prev;
    if (target === list.tail) list.tail = prev;
    list.next[target] = null;
    rec.snap(
      'POINTER_MOVE',
      'prev.next skips over target.',
      list.state([{ name: 'target', at: target }], { [target]: 'error' }, [edge(prev, after)]),
      { line: 4 },
    );
    list.remove(target);
    rec.snap('DELETE', `Free node ${v}.`, list.state(), { line: 6 });
    return `Deleted ${v} at index ${index}.`;
  },
);

export const llSearch = opDef(
  'll-search',
  'Search',
  'Follow next pointers from the head comparing each value with the target.',
  [
    'curr = head, i = 0',
    'while curr is not null (and not back at head):',
    '    if curr.value == target: return i',
    '    curr = curr.next; i++',
    'return -1',
  ],
  LIST_COMPLEXITY('O(1)', 'O(n)'),
  [{ key: 'target', label: 'Target', type: 'number' }],
  { values: [3, 7, 9, 11], target: 9 },
  (list, rec, input) => {
    const target = num(input, 'target');
    const ids = list.ids();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      rec.snap(
        'COMPARE',
        `Compare ${list.nodes.get(id)} with ${target}.`,
        list.state([{ name: 'curr', at: id }], { [id]: 'compare' }),
        { line: 3, vars: { i, target } },
      );
      if (list.nodes.get(id) === target) {
        rec.snap(
          'FOUND',
          `Found ${target} at position ${i}.`,
          list.state([{ name: 'curr', at: id }], { [id]: 'found' }),
          { line: 3, vars: { i } },
        );
        return `Found at index ${i}.`;
      }
    }
    rec.snap('NOT_FOUND', `${target} is not in the list.`, list.state(), { line: 5 });
    return 'Not found (-1).';
  },
);

export const llUpdate = opDef(
  'll-update',
  'Update at index',
  'Walk to the index and overwrite the node value.',
  ['curr = node at index', 'curr.value = value'],
  LIST_COMPLEXITY('O(1)', 'O(n)'),
  [
    { key: 'index', label: 'Index', type: 'number' },
    { key: 'value', label: 'Value', type: 'number' },
  ],
  { values: [3, 7, 9], index: 1, value: 42 },
  (list, rec, input) => {
    const index = num(input, 'index');
    const value = num(input, 'value', { min: -999, max: 999 });
    if (index < 0 || index >= list.size) {
      rec.snap('ERROR', `Index ${index} is out of range.`, list.state(), { line: 1 });
      return 'Update rejected.';
    }
    const cur = walkTo(list, rec, index, 1);
    const old = list.nodes.get(cur);
    list.nodes.set(cur, value);
    rec.snap(
      'WRITE',
      `Overwrite ${old} with ${value}.`,
      list.state([{ name: 'curr', at: cur }], { [cur]: 'found' }),
      { line: 2 },
    );
    return `Updated index ${index}.`;
  },
);

export const llTraverse = opDef(
  'll-traverse',
  'Traverse',
  'Visit every node once by following next pointers.',
  [
    'curr = head',
    'do:',
    '    visit(curr)',
    '    curr = curr.next',
    'while curr is not null and curr != head',
  ],
  LIST_COMPLEXITY('O(n)', 'O(n)'),
  [],
  { values: [3, 7, 9, 11] },
  (list, rec) => {
    const roles: Record<string, Role> = {};
    for (const id of list.ids()) {
      rec.snap(
        'VISIT',
        `Visit ${list.nodes.get(id)}.`,
        list.state([{ name: 'curr', at: id }], { ...roles, [id]: 'active' }),
        { line: 3 },
      );
      roles[id] = 'visited';
    }
    if (list.variant === 'circular' && list.head)
      rec.snap(
        'POINTER_MOVE',
        'curr is back at head — stop (circular list).',
        list.state([{ name: 'curr', at: list.head }], roles),
        { line: 5 },
      );
    return `Visited ${list.size} node(s): ${list.values().join(' → ') || 'empty'}.`;
  },
);

export const llReverse = opDef(
  'll-reverse',
  'Reverse (iterative)',
  'Flip each next pointer while walking with prev, curr and next pointers.',
  [
    'prev = null, curr = head',
    'while curr is not null:',
    '    next = curr.next',
    '    curr.next = prev',
    '    prev = curr; curr = next',
    'tail = head; head = prev',
  ],
  { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  [],
  { values: [1, 2, 3, 4, 5] },
  (list, rec) => {
    let prev: string | null = null;
    let curr = list.head;
    const ptr = (nx?: string | null) => [
      ...(prev ? [{ name: 'prev', at: prev }] : []),
      ...(curr ? [{ name: 'curr', at: curr }] : []),
      ...(nx ? [{ name: 'next', at: nx }] : []),
    ];
    rec.snap('POINTER_MOVE', 'prev = null, curr = head.', list.state(ptr()), { line: 1 });
    const oldHead = list.head;
    while (curr) {
      const nx = list.next[curr];
      rec.snap(
        'POINTER_MOVE',
        `Save next = ${nx ? list.nodes.get(nx) : 'null'}.`,
        list.state(ptr(nx), { [curr]: 'active' }),
        { line: 3 },
      );
      list.next[curr] = prev;
      rec.snap(
        'UPDATE',
        `Reverse arrow: ${list.nodes.get(curr)}.next → ${prev ? list.nodes.get(prev) : 'null'}.`,
        list.state(ptr(nx), { [curr]: 'write' }, [edge(curr, prev)]),
        { line: 4 },
      );
      prev = curr;
      curr = nx;
      rec.snap('POINTER_MOVE', 'Advance prev and curr.', list.state(ptr()), { line: 5 });
    }
    list.tail = oldHead;
    list.head = prev;
    rec.snap('POINTER_MOVE', 'head = prev. The list is reversed.', list.state(), { line: 6 });
    return `Reversed: ${list.values().join(' → ') || 'empty'}.`;
  },
  false,
);

export const llMiddle = opDef(
  'll-middle',
  'Find middle (slow/fast)',
  'Move slow by one and fast by two; when fast reaches the end, slow is at the middle.',
  [
    'slow = fast = head',
    'while fast and fast.next:',
    '    slow = slow.next',
    '    fast = fast.next.next',
    'return slow',
  ],
  { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  [],
  { values: [1, 2, 3, 4, 5, 6] },
  (list, rec) => {
    if (!list.head) return 'Empty list has no middle.';
    let slow = list.head;
    let fast: string | null = list.head;
    const p = () => [{ name: 'slow', at: slow }, ...(fast ? [{ name: 'fast', at: fast }] : [])];
    rec.snap('POINTER_MOVE', 'slow and fast start at head.', list.state(p(), { [slow]: 'active' }), {
      line: 1,
    });
    while (fast && list.next[fast]) {
      slow = list.next[slow]!;
      fast = list.next[list.next[fast]!];
      rec.snap('POINTER_MOVE', 'slow moves 1, fast moves 2.', list.state(p(), { [slow]: 'active' }), {
        line: 3,
      });
    }
    rec.snap(
      'FOUND',
      `Middle node is ${list.nodes.get(slow)} (second middle for even length).`,
      list.state([{ name: 'slow', at: slow }], { [slow]: 'found' }),
      { line: 5 },
    );
    return `Middle = ${list.nodes.get(slow)}.`;
  },
  false,
);

export const llDetectCycle: AlgorithmDef = {
  id: 'll-detect-cycle',
  name: 'Detect cycle (Floyd)',
  category: 'linked-lists',
  visual: 'linkedList',
  summary: "Floyd's tortoise and hare: if a fast pointer ever meets the slow pointer, there is a cycle.",
  pseudocode: [
    'slow = fast = head',
    'while fast and fast.next:',
    '    slow = slow.next; fast = fast.next.next',
    '    if slow == fast: return true',
    'return false',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  assumptions: ['cyclePos is the index the tail links back to; -1 means no cycle.'],
  inputs: [
    LIST_IN,
    { key: 'cyclePos', label: 'Tail links to index (-1 = none)', type: 'number', min: -1, max: 9 },
  ],
  defaultInput: { values: [3, 2, 0, -4, 7], cyclePos: 1 },
  run(input) {
    const values = listValues(input);
    const pos = num(input, 'cyclePos', { min: -1, max: Math.max(values.length - 1, -1) });
    const list = new LinkedList('singly', values);
    const ids = list.ids();
    if (pos >= 0 && list.tail) list.next[list.tail] = ids[pos];
    const rec = new TraceRecorder<LinkedListState>('ll-detect-cycle', { values, cyclePos: pos });
    let slow = list.head;
    let fast = list.head;
    const p = () => [
      ...(slow ? [{ name: 'slow', at: slow }] : []),
      ...(fast ? [{ name: 'fast', at: fast }] : []),
    ];
    rec.snap(
      'INIT',
      pos >= 0 ? `Tail links back to index ${pos}.` : 'The list ends in null.',
      list.state(p(), {}, pos >= 0 ? [edge(list.tail, ids[pos])] : []),
      { line: 1 },
    );
    let guard = 0;
    while (fast && list.next[fast] && guard++ < 50) {
      slow = list.next[slow!];
      fast = list.next[list.next[fast]!];
      rec.snap(
        'POINTER_MOVE',
        'slow +1, fast +2.',
        list.state(p(), { ...(slow ? { [slow]: 'active' } : {}), ...(fast ? { [fast]: 'compare' } : {}) }),
        { line: 3 },
      );
      if (slow && slow === fast) {
        rec.snap(
          'FOUND',
          `slow and fast meet at ${list.nodes.get(slow)} — cycle detected.`,
          list.state(p(), { [slow]: 'found' }),
          { line: 4 },
        );
        return rec.finish(true, 'Cycle present.', list.state(p(), { [slow]: 'found' }), 4);
      }
    }
    rec.snap('NOT_FOUND', 'fast reached the end — no cycle.', list.state(p()), { line: 5 });
    return rec.finish(false, 'No cycle.', list.state(), 5);
  },
};

export const llRemoveDuplicates = opDef(
  'll-remove-duplicates',
  'Remove duplicates (sorted)',
  'Since equal values are adjacent, unlink a node whenever it matches its successor.',
  [
    'curr = head',
    'while curr and curr.next:',
    '    if curr.value == curr.next.value:',
    '        curr.next = curr.next.next',
    '    else: curr = curr.next',
  ],
  { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  [],
  { values: [1, 1, 2, 3, 3, 3, 4] },
  (list, rec) => {
    const vals = list.values();
    for (let i = 1; i < vals.length; i++)
      if (vals[i - 1] > vals[i]) throw new InputError('List must be sorted ascending.');
    let cur = list.head;
    while (cur && list.next[cur]) {
      const nx = list.next[cur]!;
      rec.snap(
        'COMPARE',
        `Compare ${list.nodes.get(cur)} with next ${list.nodes.get(nx)}.`,
        list.state([{ name: 'curr', at: cur }], { [cur]: 'active', [nx]: 'compare' }),
        { line: 3 },
      );
      if (list.nodes.get(cur) === list.nodes.get(nx)) {
        list.next[cur] = list.next[nx];
        if (nx === list.tail) list.tail = cur;
        list.remove(nx);
        rec.snap(
          'DELETE',
          'Duplicate — unlink it.',
          list.state([{ name: 'curr', at: cur }], { [cur]: 'active' }, [edge(cur, list.next[cur])]),
          { line: 4 },
        );
      } else {
        cur = nx;
        rec.snap(
          'POINTER_MOVE',
          'Different — advance curr.',
          list.state([{ name: 'curr', at: cur }], { [cur]: 'active' }),
          { line: 5 },
        );
      }
    }
    return `Result: ${list.values().join(' → ') || 'empty'}.`;
  },
  false,
);

llRemoveDuplicates.randomInput = (seed) => ({ values: sortedRandomInts(seed, 8, 1, 5) });

export const llMergeSorted: AlgorithmDef = {
  id: 'll-merge-sorted',
  name: 'Merge two sorted lists',
  category: 'linked-lists',
  visual: 'linkedList',
  summary: 'Splice nodes from two sorted lists onto a dummy head, always taking the smaller node.',
  pseudocode: [
    'dummy = tail = new Node()',
    'while a and b:',
    '    if a.value <= b.value: tail.next = a; a = a.next',
    '    else: tail.next = b; b = b.next',
    '    tail = tail.next',
    'tail.next = a or b',
    'return dummy.next',
  ],
  complexity: { time: { best: 'O(n+m)', average: 'O(n+m)', worst: 'O(n+m)' }, space: 'O(1)', stable: true },
  inputs: [
    { key: 'a', label: 'List A (sorted)', type: 'numbers', maxLength: 6 },
    { key: 'b', label: 'List B (sorted)', type: 'numbers', maxLength: 6 },
  ],
  defaultInput: { a: [1, 4, 7], b: [2, 3, 8, 9] },
  randomInput: (seed) => ({ a: sortedRandomInts(seed, 4), b: sortedRandomInts(seed + 3, 4) }),
  run(input) {
    const A = nums(input, 'a', { max: 6 });
    const B = nums(input, 'b', { max: 6 });
    for (const v of [A, B])
      for (let i = 1; i < v.length; i++)
        if (v[i - 1] > v[i]) throw new InputError('Both lists must be sorted ascending.');
    // Build both lists inside one LinkedList store so all nodes render together.
    const store = new LinkedList('singly');
    const build = (vals: number[]) => {
      const ids = vals.map((v) => store.newNode(v));
      ids.forEach((id, i) => (store.next[id] = ids[i + 1] ?? null));
      return ids[0] ?? null;
    };
    const dummy = store.newNode(0);
    store.nodes.set(dummy, 0);
    let a: string | null = build(A);
    let b: string | null = build(B);
    store.head = dummy;
    store.tail = dummy;
    const label = (s: LinkedListState): LinkedListState => ({
      ...s,
      nodes: s.nodes.map((n) => (n.id === dummy ? { ...n, value: 'dummy' } : n)),
    });
    const rec = new TraceRecorder<LinkedListState>('ll-merge-sorted', { a: A, b: B });
    let tail = dummy;
    const st = (roles: Record<string, Role> = {}, changed: string[] = []) =>
      label(
        store.state(
          [
            { name: 'tail', at: tail },
            ...(a ? [{ name: 'a', at: a }] : []),
            ...(b ? [{ name: 'b', at: b }] : []),
          ],
          { [dummy]: 'muted', ...roles },
          changed,
        ),
      );
    rec.snap('INIT', 'Create a dummy node; tail points at it.', st(), { line: 1 });
    while (a && b) {
      rec.snap(
        'COMPARE',
        `Compare a = ${store.nodes.get(a)} with b = ${store.nodes.get(b)}.`,
        st({ [a]: 'compare', [b]: 'compare' }),
        { line: 2 },
      );
      if (store.nodes.get(a)! <= store.nodes.get(b)!) {
        store.next[tail] = a;
        a = store.next[a];
      } else {
        store.next[tail] = b;
        b = store.next[b];
      }
      const linked = store.next[tail]!;
      rec.snap(
        'POINTER_MOVE',
        `Link ${store.nodes.get(linked)} after tail.`,
        st({ [linked]: 'write' }, [edge(tail, linked)]),
        { line: 3 },
      );
      tail = linked;
      store.tail = tail;
    }
    store.next[tail] = a ?? b;
    if (a ?? b)
      rec.snap('POINTER_MOVE', 'Attach the remaining nodes.', st({}, [edge(tail, a ?? b)]), { line: 6 });
    store.head = store.next[dummy];
    store.remove(dummy);
    let t = store.head;
    while (t && store.next[t]) t = store.next[t];
    store.tail = t;
    return rec.finish(store.values(), `Merged: ${store.values().join(' → ') || 'empty'}.`, store.state());
  },
};

export const LINKED_LIST_ALGORITHMS: AlgorithmDef[] = [
  llInsertHead,
  llInsertTail,
  llInsertAt,
  llDeleteHead,
  llDeleteTail,
  llDeleteAt,
  llSearch,
  llUpdate,
  llTraverse,
  llReverse,
  llMiddle,
  llDetectCycle,
  llRemoveDuplicates,
  llMergeSorted,
];
