import { InputError, TraceRecorder } from '@/engine/recorder';
import type { Pointer, Role, TreeState } from '@/engine/types';
import type { AlgorithmDef, AlgoInput } from './types';
import { num, nums, randomInts } from './util';

interface BNode {
  value: number;
  left: string | null;
  right: string | null;
  height: number;
}

/** Binary tree store with stable node ids, shared by binary tree, BST and AVL engines. */
export class BTree {
  nodes = new Map<string, BNode>();
  root: string | null = null;
  private seq = 0;
  constructor(readonly variant: TreeState['variant']) {}

  create(value: number): string {
    const id = `t${this.seq++}`;
    this.nodes.set(id, { value, left: null, right: null, height: 1 });
    return id;
  }
  n(id: string): BNode {
    return this.nodes.get(id)!;
  }
  h(id: string | null): number {
    return id ? this.n(id).height : 0;
  }
  update(id: string) {
    const nd = this.n(id);
    nd.height = 1 + Math.max(this.h(nd.left), this.h(nd.right));
  }
  balance(id: string): number {
    return this.h(this.n(id).left) - this.h(this.n(id).right);
  }
  state(roles: Record<string, Role> = {}, pointers: Pointer[] = [], output?: string[]): TreeState {
    const visible: string[] = [];
    const walk = (id: string | null) => {
      if (!id) return;
      visible.push(id);
      walk(this.n(id).left);
      walk(this.n(id).right);
    };
    walk(this.root);
    return {
      kind: 'tree',
      variant: this.variant,
      root: this.root,
      nodes: visible.map((id) => {
        const nd = this.n(id);
        return {
          id,
          label: String(nd.value),
          children: [nd.left, nd.right],
          badge: this.variant === 'avl' ? `bf ${this.balance(id)}` : undefined,
        };
      }),
      nodeRoles: roles,
      pointers,
      output: output ? { label: 'output', tokens: [...output] } : undefined,
    };
  }
  /** Level-order array with nulls, e.g. [1, 2, 3, null, 4] */
  static fromLevelOrder(values: (number | null)[], variant: TreeState['variant'] = 'binary'): BTree {
    const t = new BTree(variant);
    if (!values.length || values[0] === null) return t;
    t.root = t.create(values[0]);
    const q: string[] = [t.root];
    let i = 1;
    while (q.length && i < values.length) {
      const cur = q.shift()!;
      const l = values[i++];
      if (l !== null && l !== undefined) {
        t.n(cur).left = t.create(l);
        q.push(t.n(cur).left!);
      }
      if (i < values.length) {
        const r = values[i++];
        if (r !== null && r !== undefined) {
          t.n(cur).right = t.create(r);
          q.push(t.n(cur).right!);
        }
      }
    }
    return t;
  }
  inorder(id: string | null = this.root, out: number[] = []): number[] {
    if (!id) return out;
    this.inorder(this.n(id).left, out);
    out.push(this.n(id).value);
    this.inorder(this.n(id).right, out);
    return out;
  }
}

function parseLevelOrder(input: AlgoInput): (number | null)[] {
  const raw = String(input.tree ?? '');
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length > 15) throw new InputError('At most 15 positions in the level-order list.');
  return parts.map((p) => {
    if (p.toLowerCase() === 'null' || p === '_' || p === '#') return null;
    const v = Number(p);
    if (!Number.isInteger(v) || Math.abs(v) > 999) throw new InputError(`Bad tree value "${p}"`);
    return v;
  });
}

const TREE_IN = {
  key: 'tree',
  label: 'Level order (use null for gaps)',
  type: 'text' as const,
  maxLength: 80,
};
const ON = { best: 'O(n)', average: 'O(n)', worst: 'O(n)' };

type Traversal = 'preorder' | 'inorder' | 'postorder' | 'levelorder';

function traversalDef(kind: Traversal): AlgorithmDef {
  const pseudo: Record<Traversal, string[]> = {
    preorder: [
      'preorder(node):',
      '    if node is null: return',
      '    visit(node)',
      '    preorder(node.left)',
      '    preorder(node.right)',
    ],
    inorder: [
      'inorder(node):',
      '    if node is null: return',
      '    inorder(node.left)',
      '    visit(node)',
      '    inorder(node.right)',
    ],
    postorder: [
      'postorder(node):',
      '    if node is null: return',
      '    postorder(node.left)',
      '    postorder(node.right)',
      '    visit(node)',
    ],
    levelorder: [
      'queue = [root]',
      'while queue not empty:',
      '    node = queue.dequeue(); visit(node)',
      '    if node.left: queue.enqueue(node.left)',
      '    if node.right: queue.enqueue(node.right)',
    ],
  };
  const names: Record<Traversal, string> = {
    preorder: 'Preorder traversal',
    inorder: 'Inorder traversal',
    postorder: 'Postorder traversal',
    levelorder: 'Level-order traversal (BFS)',
  };
  return {
    id: `tree-${kind}`,
    name: names[kind],
    category: 'trees',
    visual: 'tree',
    summary:
      kind === 'levelorder'
        ? 'Visit nodes level by level using a queue.'
        : `Depth-first ${kind} traversal using recursion.`,
    pseudocode: pseudo[kind],
    complexity: { time: ON, space: kind === 'levelorder' ? 'O(w) queue width' : 'O(h) recursion depth' },
    inputs: [TREE_IN],
    defaultInput: { tree: '1, 2, 3, 4, 5, null, 6' },
    run(input) {
      const t = BTree.fromLevelOrder(parseLevelOrder(input));
      const rec = new TraceRecorder<TreeState>(`tree-${kind}`, { tree: input.tree });
      const out: string[] = [];
      const roles: Record<string, Role> = {};
      rec.snap('INIT', `Run ${names[kind].toLowerCase()}.`, t.state(roles, [], out), { line: 1 });
      if (kind === 'levelorder') {
        const q: string[] = t.root ? [t.root] : [];
        while (q.length) {
          const id = q.shift()!;
          out.push(String(t.n(id).value));
          roles[id] = 'visited';
          const front = q.map((x) => String(t.n(x).value));
          rec.snap(
            'VISIT',
            `Dequeue and visit ${t.n(id).value}.`,
            t.state({ ...roles, [id]: 'active' }, [{ name: 'node', at: id }], out),
            { line: 3, vars: { queue: front } },
          );
          for (const child of [t.n(id).left, t.n(id).right]) {
            if (child) {
              q.push(child);
              roles[child] = 'frontier';
              rec.snap(
                'ENQUEUE',
                `Enqueue child ${t.n(child).value}.`,
                t.state({ ...roles }, [{ name: 'node', at: id }], out),
                { line: child === t.n(id).left ? 4 : 5, vars: { queue: q.map((x) => String(t.n(x).value)) } },
              );
            }
          }
          roles[id] = 'visited';
        }
      } else {
        const go = (id: string | null, depth: number) => {
          if (!id) return;
          const nd = t.n(id);
          rec.snap(
            'CALL',
            `${kind}(${nd.value}) at depth ${depth}.`,
            t.state({ ...roles, [id]: roles[id] ?? 'frontier' }, [{ name: 'node', at: id }], out),
            { line: 1, vars: { node: nd.value, depth } },
          );
          const visit = () => {
            out.push(String(nd.value));
            roles[id] = 'visited';
            rec.snap(
              'VISIT',
              `Visit ${nd.value}.`,
              t.state({ ...roles, [id]: 'active' }, [{ name: 'node', at: id }], out),
              { line: kind === 'preorder' ? 3 : kind === 'inorder' ? 4 : 5, vars: { node: nd.value } },
            );
          };
          if (kind === 'preorder') visit();
          go(nd.left, depth + 1);
          if (kind === 'inorder') visit();
          go(nd.right, depth + 1);
          if (kind === 'postorder') visit();
          rec.snap('RETURN', `Return from ${nd.value}.`, t.state(roles, [], out), {
            line: 2,
            vars: { node: nd.value, depth },
          });
        };
        go(t.root, 0);
      }
      return rec.finish(
        out.map(Number),
        `${names[kind]}: ${out.join(' ') || 'empty tree'}.`,
        t.state(roles, [], out),
      );
    },
  };
}

export const preorder = traversalDef('preorder');
export const inorder = traversalDef('inorder');
export const postorder = traversalDef('postorder');
export const levelorder = traversalDef('levelorder');

export const treeHeight: AlgorithmDef = {
  id: 'tree-height',
  name: 'Height & node count',
  category: 'trees',
  visual: 'tree',
  summary:
    'height(node) = 1 + max(height(left), height(right)); count(node) = 1 + count(left) + count(right).',
  pseudocode: [
    'measure(node):',
    '    if node is null: return (0, 0)',
    '    (hl, cl) = measure(node.left)',
    '    (hr, cr) = measure(node.right)',
    '    return (1 + max(hl, hr), 1 + cl + cr)',
  ],
  complexity: { time: ON, space: 'O(h)' },
  inputs: [TREE_IN],
  defaultInput: { tree: '1, 2, 3, 4, null, null, 5, 6' },
  run(input) {
    const t = BTree.fromLevelOrder(parseLevelOrder(input));
    const rec = new TraceRecorder<TreeState>('tree-height', { tree: input.tree });
    const roles: Record<string, Role> = {};
    rec.snap('INIT', 'Compute height (in nodes) and count bottom-up.', t.state(), { line: 1 });
    const go = (id: string | null): [number, number] => {
      if (!id) return [0, 0];
      roles[id] = 'frontier';
      rec.snap('CALL', `measure(${t.n(id).value})`, t.state({ ...roles, [id]: 'active' }), { line: 1 });
      const [hl, cl] = go(t.n(id).left);
      const [hr, cr] = go(t.n(id).right);
      const res: [number, number] = [1 + Math.max(hl, hr), 1 + cl + cr];
      roles[id] = 'visited';
      rec.snap(
        'RETURN',
        `Node ${t.n(id).value}: height ${res[0]}, count ${res[1]}.`,
        t.state({ ...roles, [id]: 'found' }),
        { line: 5, vars: { node: t.n(id).value, height: res[0], count: res[1], hl, hr } },
      );
      return res;
    };
    const [height, count] = go(t.root);
    return rec.finish({ height, count }, `Height = ${height} level(s), ${count} node(s).`, t.state(roles));
  },
};

export const mirrorTree: AlgorithmDef = {
  id: 'tree-mirror',
  name: 'Mirror a tree',
  category: 'trees',
  visual: 'tree',
  summary: 'Swap the left and right child of every node (post-order).',
  pseudocode: [
    'mirror(node):',
    '    if node is null: return',
    '    mirror(node.left); mirror(node.right)',
    '    swap(node.left, node.right)',
  ],
  complexity: { time: ON, space: 'O(h)' },
  inputs: [TREE_IN],
  defaultInput: { tree: '4, 2, 7, 1, 3, 6, 9' },
  run(input) {
    const t = BTree.fromLevelOrder(parseLevelOrder(input));
    const rec = new TraceRecorder<TreeState>('tree-mirror', { tree: input.tree });
    rec.snap('INIT', 'Mirror the tree.', t.state(), { line: 1 });
    const go = (id: string | null) => {
      if (!id) return;
      go(t.n(id).left);
      go(t.n(id).right);
      const nd = t.n(id);
      [nd.left, nd.right] = [nd.right, nd.left];
      rec.snap('SWAP', `Swap the children of ${nd.value}.`, t.state({ [id]: 'swap' }), { line: 4 });
    };
    go(t.root);
    return rec.finish(t.inorder(), 'Mirrored. The inorder sequence is now reversed.', t.state());
  },
};

export const treeSearch: AlgorithmDef = {
  id: 'tree-search',
  name: 'Search (any binary tree)',
  category: 'trees',
  visual: 'tree',
  summary: 'Without ordering we must explore every branch (DFS) until the value is found.',
  pseudocode: [
    'find(node, x):',
    '    if node is null: return false',
    '    if node.value == x: return true',
    '    return find(node.left, x) or find(node.right, x)',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(h)' },
  inputs: [TREE_IN, { key: 'target', label: 'Target', type: 'number' }],
  defaultInput: { tree: '1, 2, 3, 4, 5, null, 6', target: 5 },
  run(input) {
    const t = BTree.fromLevelOrder(parseLevelOrder(input));
    const target = num(input, 'target');
    const rec = new TraceRecorder<TreeState>('tree-search', { tree: input.tree, target });
    const roles: Record<string, Role> = {};
    rec.snap('INIT', `Search for ${target}.`, t.state(), { line: 1 });
    let found: string | null = null;
    const go = (id: string | null): boolean => {
      if (!id) return false;
      rec.snap(
        'COMPARE',
        `Compare ${t.n(id).value} with ${target}.`,
        t.state({ ...roles, [id]: 'compare' }, [{ name: 'node', at: id }]),
        { line: 3 },
      );
      roles[id] = 'visited';
      if (t.n(id).value === target) {
        found = id;
        return true;
      }
      return go(t.n(id).left) || go(t.n(id).right);
    };
    const ok = go(t.root);
    if (ok) rec.snap('FOUND', `Found ${target}.`, t.state({ ...roles, [found!]: 'found' }), { line: 3 });
    else rec.snap('NOT_FOUND', `${target} is not in the tree.`, t.state(roles), { line: 2 });
    return rec.finish(ok, ok ? 'Found.' : 'Not found.', t.state(found ? { [found]: 'found' } : {}));
  },
};

// ---------------------------------------------------------------- BST

export function bstInsertSilent(t: BTree, value: number): void {
  if (!t.root) {
    t.root = t.create(value);
    return;
  }
  let cur = t.root;
  for (;;) {
    const nd = t.n(cur);
    if (value === nd.value) return; // duplicates ignored
    const dir = value < nd.value ? 'left' : 'right';
    if (!nd[dir]) {
      nd[dir] = t.create(value);
      return;
    }
    cur = nd[dir]!;
  }
}

function buildBst(values: number[], variant: TreeState['variant'] = 'bst'): BTree {
  const t = new BTree(variant);
  values.forEach((v) => bstInsertSilent(t, v));
  return t;
}

const BST_IN = { key: 'values', label: 'Insert order', type: 'numbers' as const, maxLength: 15 };
const KEY_IN = { key: 'key', label: 'Key', type: 'number' as const };
const LOGN = { best: 'O(1)', average: 'O(log n)', worst: 'O(n) if unbalanced' };

function bstDef(
  id: string,
  name: string,
  summary: string,
  pseudocode: string[],
  withKey: boolean,
  defaults: AlgoInput,
  body: (
    t: BTree,
    rec: TraceRecorder<TreeState>,
    key: number,
  ) => { result: number | boolean | number[] | null; msg: string },
): AlgorithmDef {
  return {
    id,
    name,
    category: 'trees',
    visual: 'tree',
    summary,
    pseudocode,
    complexity: { time: LOGN, space: 'O(h)' },
    assumptions: ['Duplicate keys are ignored on insert.'],
    inputs: withKey ? [BST_IN, KEY_IN] : [BST_IN],
    defaultInput: defaults,
    randomInput: (seed) => ({ ...defaults, values: randomInts(seed, 8) }),
    run(input) {
      const values = nums(input, 'values', { max: 15 });
      const key = withKey ? num(input, 'key') : 0;
      const t = buildBst(values);
      const rec = new TraceRecorder<TreeState>(id, { values, ...(withKey ? { key } : {}) });
      rec.snap('INIT', `BST built from [${values.join(', ')}].`, t.state(), { line: 1 });
      const { result, msg } = body(t, rec, key);
      return rec.finish(result, msg, t.state());
    },
  };
}

export const bstInsert = bstDef(
  'bst-insert',
  'BST insert',
  'Walk left when smaller, right when larger, and attach the new node at the first empty spot.',
  [
    'curr = root',
    'while true:',
    '    if key < curr.value: go left (attach if empty)',
    '    else if key > curr.value: go right (attach if empty)',
    '    else: duplicate — ignore',
  ],
  true,
  { values: [50, 30, 70, 20, 40, 60, 80], key: 65 },
  (t, rec, key) => {
    if (!t.root) {
      t.root = t.create(key);
      rec.snap('INSERT', `Empty tree — ${key} becomes the root.`, t.state({ [t.root]: 'found' }), {
        line: 1,
      });
      return { result: t.inorder(), msg: 'Inserted.' };
    }
    let cur = t.root;
    for (;;) {
      const nd = t.n(cur);
      rec.snap(
        'COMPARE',
        `Compare ${key} with ${nd.value}.`,
        t.state({ [cur]: 'compare' }, [{ name: 'curr', at: cur }]),
        { line: key < nd.value ? 3 : key > nd.value ? 4 : 5 },
      );
      if (key === nd.value) {
        rec.snap('ERROR', `${key} already exists — duplicates are ignored.`, t.state({ [cur]: 'error' }), {
          line: 5,
        });
        return { result: t.inorder(), msg: 'Duplicate ignored.' };
      }
      const dir = key < nd.value ? 'left' : 'right';
      if (!nd[dir]) {
        nd[dir] = t.create(key);
        rec.snap(
          'INSERT',
          `Attach ${key} as the ${dir} child of ${nd.value}.`,
          t.state({ [nd[dir]!]: 'found' }),
          { line: dir === 'left' ? 3 : 4 },
        );
        return { result: t.inorder(), msg: `Inserted ${key}.` };
      }
      cur = nd[dir]!;
    }
  },
);

export const bstSearch = bstDef(
  'bst-search',
  'BST search',
  'Use the ordering to discard half of the remaining tree at every comparison.',
  [
    'curr = root',
    'while curr:',
    '    if key == curr.value: return true',
    '    curr = key < curr.value ? curr.left : curr.right',
    'return false',
  ],
  true,
  { values: [50, 30, 70, 20, 40, 60, 80], key: 60 },
  (t, rec, key) => {
    let cur = t.root;
    const roles: Record<string, Role> = {};
    while (cur) {
      const nd = t.n(cur);
      rec.snap(
        'COMPARE',
        `Compare ${key} with ${nd.value}.`,
        t.state({ ...roles, [cur]: 'compare' }, [{ name: 'curr', at: cur }]),
        { line: 3 },
      );
      if (nd.value === key) {
        rec.snap(
          'FOUND',
          `Found ${key}.`,
          t.state({ ...roles, [cur]: 'found' }, [{ name: 'curr', at: cur }]),
          { line: 3 },
        );
        return { result: true, msg: 'Found.' };
      }
      roles[cur] = 'path';
      cur = key < nd.value ? nd.left : nd.right;
      rec.snap(
        'POINTER_MOVE',
        `${key} ${key < nd.value ? '<' : '>'} ${nd.value}: go ${key < nd.value ? 'left' : 'right'}.`,
        t.state(roles, cur ? [{ name: 'curr', at: cur }] : []),
        { line: 4 },
      );
    }
    rec.snap('NOT_FOUND', `Reached null — ${key} is not in the tree.`, t.state(roles), { line: 5 });
    return { result: false, msg: 'Not found.' };
  },
);

function extremeDef(which: 'min' | 'max'): AlgorithmDef {
  return bstDef(
    `bst-${which}`,
    `BST ${which === 'min' ? 'minimum' : 'maximum'}`,
    `Keep going ${which === 'min' ? 'left' : 'right'} until there is no ${which === 'min' ? 'left' : 'right'} child.`,
    [
      'curr = root',
      `while curr.${which === 'min' ? 'left' : 'right'}: curr = curr.${which === 'min' ? 'left' : 'right'}`,
      'return curr.value',
    ],
    false,
    { values: [50, 30, 70, 20, 40, 60, 80] },
    (t, rec) => {
      if (!t.root) return { result: null, msg: 'Empty tree.' };
      let cur = t.root;
      const dir = which === 'min' ? 'left' : 'right';
      const roles: Record<string, Role> = {};
      while (t.n(cur)[dir]) {
        roles[cur] = 'path';
        rec.snap(
          'POINTER_MOVE',
          `${t.n(cur).value} has a ${dir} child — go ${dir}.`,
          t.state({ ...roles, [cur]: 'active' }, [{ name: 'curr', at: cur }]),
          { line: 2 },
        );
        cur = t.n(cur)[dir]!;
      }
      rec.snap(
        'FOUND',
        `${which === 'min' ? 'Minimum' : 'Maximum'} is ${t.n(cur).value}.`,
        t.state({ ...roles, [cur]: 'found' }, [{ name: 'curr', at: cur }]),
        { line: 3 },
      );
      return { result: t.n(cur).value, msg: `${which} = ${t.n(cur).value}.` };
    },
  );
}
export const bstMin = extremeDef('min');
export const bstMax = extremeDef('max');

function neighbourDef(which: 'successor' | 'predecessor'): AlgorithmDef {
  const succ = which === 'successor';
  return bstDef(
    `bst-${which}`,
    `BST ${which}`,
    succ ? 'Smallest key greater than the given key.' : 'Largest key smaller than the given key.',
    [
      'ans = null, curr = root',
      'while curr:',
      succ
        ? '    if curr.value > key: ans = curr; curr = curr.left'
        : '    if curr.value < key: ans = curr; curr = curr.right',
      succ ? '    else: curr = curr.right' : '    else: curr = curr.left',
      'return ans',
    ],
    true,
    { values: [50, 30, 70, 20, 40, 60, 80], key: 40 },
    (t, rec, key) => {
      let cur = t.root;
      let ans: string | null = null;
      const roles: Record<string, Role> = {};
      while (cur) {
        const v = t.n(cur).value;
        const better = succ ? v > key : v < key;
        rec.snap(
          'COMPARE',
          `${v} ${better ? (succ ? '>' : '<') : succ ? '≤' : '≥'} ${key}.`,
          t.state({ ...roles, [cur]: 'compare', ...(ans ? { [ans]: 'found' as Role } : {}) }, [
            { name: 'curr', at: cur },
          ]),
          { line: better ? 3 : 4, vars: { ans: ans ? t.n(ans).value : null } },
        );
        roles[cur] = 'path';
        if (better) {
          ans = cur;
          cur = succ ? t.n(cur).left : t.n(cur).right;
        } else cur = succ ? t.n(cur).right : t.n(cur).left;
      }
      const res = ans ? t.n(ans).value : null;
      rec.snap(
        ans ? 'FOUND' : 'NOT_FOUND',
        ans ? `${which} of ${key} is ${res}.` : `${key} has no ${which}.`,
        t.state(ans ? { ...roles, [ans]: 'found' } : roles),
        { line: 5 },
      );
      return { result: res, msg: `${which} = ${res ?? 'none'}.` };
    },
  );
}
export const bstSuccessor = neighbourDef('successor');
export const bstPredecessor = neighbourDef('predecessor');

export const bstDelete = bstDef(
  'bst-delete',
  'BST delete (all three cases)',
  'Leaf: remove. One child: splice the child up. Two children: copy the inorder successor, then delete it.',
  [
    'find node with key (track parent)',
    'case leaf: parent.child = null',
    'case one child: parent.child = node.child',
    'case two children:',
    '    succ = min(node.right)',
    '    node.value = succ.value; delete succ from right subtree',
  ],
  true,
  { values: [50, 30, 70, 20, 40, 60, 80, 65], key: 50 },
  (t, rec, key) => {
    let parent: string | null = null;
    let cur = t.root;
    while (cur && t.n(cur).value !== key) {
      rec.snap(
        'COMPARE',
        `Compare ${key} with ${t.n(cur).value}.`,
        t.state({ [cur]: 'compare' }, [{ name: 'curr', at: cur }]),
        { line: 1 },
      );
      parent = cur;
      cur = key < t.n(cur).value ? t.n(cur).left : t.n(cur).right;
    }
    if (!cur) {
      rec.snap('NOT_FOUND', `${key} is not in the tree.`, t.state(), { line: 1 });
      return { result: t.inorder(), msg: 'Nothing deleted.' };
    }
    const replaceChild = (p: string | null, oldId: string, newId: string | null) => {
      if (!p) t.root = newId;
      else if (t.n(p).left === oldId) t.n(p).left = newId;
      else t.n(p).right = newId;
    };
    const nd = t.n(cur);
    rec.snap('FOUND', `Found ${key}.`, t.state({ [cur]: 'error' }, [{ name: 'node', at: cur }]), { line: 1 });
    if (!nd.left && !nd.right) {
      replaceChild(parent, cur, null);
      t.nodes.delete(cur);
      rec.snap('DELETE', 'Case 1: leaf — just remove it.', t.state(), { line: 2 });
    } else if (!nd.left || !nd.right) {
      const child = (nd.left ?? nd.right)!;
      replaceChild(parent, cur, child);
      t.nodes.delete(cur);
      rec.snap(
        'DELETE',
        `Case 2: one child — splice ${t.n(child).value} into its place.`,
        t.state({ [child]: 'found' }),
        { line: 3 },
      );
    } else {
      let sp = cur;
      let s = nd.right;
      rec.snap(
        'POINTER_MOVE',
        'Case 3: two children — find the inorder successor (min of right subtree).',
        t.state({ [cur]: 'error', [s]: 'active' }, [{ name: 'succ', at: s }]),
        { line: 5 },
      );
      while (t.n(s).left) {
        sp = s;
        s = t.n(s).left!;
        rec.snap(
          'POINTER_MOVE',
          `Go left to ${t.n(s).value}.`,
          t.state({ [cur]: 'error', [s]: 'active' }, [{ name: 'succ', at: s }]),
          { line: 5 },
        );
      }
      nd.value = t.n(s).value;
      rec.snap(
        'WRITE',
        `Copy successor ${nd.value} into the node.`,
        t.state({ [cur]: 'write', [s]: 'error' }),
        { line: 6 },
      );
      replaceChild(sp, s, t.n(s).right);
      t.nodes.delete(s);
      rec.snap(
        'DELETE',
        'Remove the successor (it has at most a right child).',
        t.state({ [cur]: 'found' }),
        { line: 6 },
      );
    }
    return { result: t.inorder(), msg: `Deleted ${key}. Inorder: ${t.inorder().join(' ')}.` };
  },
);

// ---------------------------------------------------------------- AVL

export class AvlTree extends BTree {
  constructor() {
    super('avl');
  }
  rotateRight(y: string): string {
    const x = this.n(y).left!;
    this.n(y).left = this.n(x).right;
    this.n(x).right = y;
    this.update(y);
    this.update(x);
    return x;
  }
  rotateLeft(x: string): string {
    const y = this.n(x).right!;
    this.n(x).right = this.n(y).left;
    this.n(y).left = x;
    this.update(x);
    this.update(y);
    return y;
  }
  /** Rebalance node; reports rotations via callback. Returns the new subtree root. */
  rebalance(id: string, onRotate: (kind: string, pivot: string, root: () => void) => void): string {
    this.update(id);
    const bf = this.balance(id);
    if (bf > 1) {
      const l = this.n(id).left!;
      if (this.balance(l) < 0) {
        this.n(id).left = this.rotateLeft(l);
        onRotate('LR: rotate left at ' + this.n(l).value, l, () => {});
      }
      const r = this.rotateRight(id);
      onRotate('rotate right at ' + this.n(id).value, r, () => {});
      return r;
    }
    if (bf < -1) {
      const r0 = this.n(id).right!;
      if (this.balance(r0) > 0) {
        this.n(id).right = this.rotateRight(r0);
        onRotate('RL: rotate right at ' + this.n(r0).value, r0, () => {});
      }
      const r = this.rotateLeft(id);
      onRotate('rotate left at ' + this.n(id).value, r, () => {});
      return r;
    }
    return id;
  }
  insert(
    value: number,
    onStep?: (op: 'COMPARE' | 'INSERT' | 'ROTATE' | 'UPDATE', msg: string, at: string) => void,
  ): void {
    const go = (id: string | null): string => {
      if (!id) {
        const nid = this.create(value);
        onStep?.('INSERT', `Attach ${value}.`, nid);
        return nid;
      }
      const nd = this.n(id);
      onStep?.('COMPARE', `Compare ${value} with ${nd.value}.`, id);
      if (value < nd.value) nd.left = go(nd.left);
      else if (value > nd.value) nd.right = go(nd.right);
      else return id;
      return this.rebalanceWith(id, onStep);
    };
    this.root = go(this.root);
    if (this.root) onStep?.('UPDATE', 'Tree balanced.', this.root);
  }
  remove(
    value: number,
    onStep?: (op: 'COMPARE' | 'INSERT' | 'ROTATE' | 'UPDATE' | 'DELETE', msg: string, at: string) => void,
  ): boolean {
    let removed = false;
    const go = (id: string | null, v: number): string | null => {
      if (!id) return null;
      const nd = this.n(id);
      onStep?.('COMPARE', `Compare ${v} with ${nd.value}.`, id);
      if (v < nd.value) nd.left = go(nd.left, v);
      else if (v > nd.value) nd.right = go(nd.right, v);
      else {
        removed = true;
        if (!nd.left || !nd.right) {
          const child = nd.left ?? nd.right;
          onStep?.('DELETE', `Remove ${nd.value}${child ? ` and lift ${this.n(child).value}` : ''}.`, id);
          this.nodes.delete(id);
          return child;
        }
        let s = nd.right;
        while (this.n(s).left) s = this.n(s).left!;
        onStep?.('UPDATE', `Two children: replace ${nd.value} with successor ${this.n(s).value}.`, id);
        nd.value = this.n(s).value;
        nd.right = go(nd.right, nd.value);
      }
      return this.rebalanceWith(id, onStep);
    };
    this.root = go(this.root, value);
    return removed;
  }
  private rebalanceWith(
    id: string,
    onStep?: (op: 'ROTATE' | 'UPDATE', msg: string, at: string) => void,
  ): string {
    this.update(id);
    const bf = this.balance(id);
    if (Math.abs(bf) > 1)
      onStep?.('UPDATE', `Node ${this.n(id).value} has balance factor ${bf} — unbalanced.`, id);
    return this.rebalance(id, (kind, pivot) =>
      onStep?.('ROTATE', `${kind[0].toUpperCase()}${kind.slice(1)}.`, pivot),
    );
  }
  isBalanced(id: string | null = this.root): boolean {
    if (!id) return true;
    const nd = this.n(id);
    return (
      Math.abs(this.h(nd.left) - this.h(nd.right)) <= 1 &&
      this.isBalanced(nd.left) &&
      this.isBalanced(nd.right)
    );
  }
}

const AVL_PSEUDO = [
  'insert like a BST (delete: remove like a BST)',
  'on the way back up: update height',
  'bf = height(left) - height(right)',
  'bf > 1 and left child leans right: rotate left at child (LR)',
  'bf > 1: rotate right at node (LL)',
  'bf < -1 and right child leans left: rotate right at child (RL)',
  'bf < -1: rotate left at node (RR)',
];

function lineFor(msg: string): number {
  if (msg.startsWith('LR')) return 4;
  if (msg.startsWith('RL')) return 6;
  if (msg.startsWith('Rotate right')) return 5;
  if (msg.startsWith('Rotate left')) return 7;
  return 3;
}

export const avlInsert: AlgorithmDef = {
  id: 'avl-insert',
  name: 'AVL insert (with rotations)',
  category: 'trees',
  visual: 'tree',
  summary:
    'Insert like a BST, then walk back up fixing any node whose balance factor leaves [-1, 1] with LL, RR, LR or RL rotations.',
  pseudocode: AVL_PSEUDO,
  complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(log n)' },
  inputs: [{ key: 'values', label: 'Insert sequence', type: 'numbers', maxLength: 15 }],
  defaultInput: { values: [30, 20, 10, 25, 28, 40, 50] },
  randomInput: (seed) => ({ values: randomInts(seed, 8) }),
  run(input) {
    const values = nums(input, 'values', { max: 15 });
    const t = new AvlTree();
    const rec = new TraceRecorder<TreeState>('avl-insert', { values });
    rec.snap('INIT', 'Empty AVL tree.', t.state(), { line: 1 });
    for (const v of values) {
      t.insert(v, (op, msg, at) => {
        if (!t.nodes.has(at)) return;
        const role: Role =
          op === 'ROTATE' ? 'swap' : op === 'INSERT' ? 'found' : op === 'UPDATE' ? 'error' : 'compare';
        if (op === 'UPDATE' && msg === 'Tree balanced.') {
          rec.snap('UPDATE', `Inserted ${v}; every balance factor is within [-1, 1].`, t.state(), {
            line: 2,
          });
          return;
        }
        rec.snap(op, msg, t.state({ [at]: role }), {
          line: op === 'ROTATE' ? lineFor(msg) : op === 'UPDATE' ? 3 : 1,
          vars: { inserting: v },
        });
      });
    }
    return rec.finish(t.inorder(), `AVL tree with ${t.nodes.size} nodes, height ${t.h(t.root)}.`, t.state());
  },
};

export const avlDelete: AlgorithmDef = {
  id: 'avl-delete',
  name: 'AVL delete (with rotations)',
  category: 'trees',
  visual: 'tree',
  summary: 'Delete like a BST, then rebalance every ancestor on the way back up.',
  pseudocode: AVL_PSEUDO,
  complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(log n)' },
  inputs: [{ key: 'values', label: 'Build from', type: 'numbers', maxLength: 15 }, KEY_IN],
  defaultInput: { values: [50, 30, 70, 20, 40, 80, 10], key: 70 },
  run(input) {
    const values = nums(input, 'values', { max: 15 });
    const key = num(input, 'key');
    const t = new AvlTree();
    values.forEach((v) => t.insert(v));
    const rec = new TraceRecorder<TreeState>('avl-delete', { values, key });
    rec.snap('INIT', `AVL tree built from [${values.join(', ')}]. Delete ${key}.`, t.state(), { line: 1 });
    const removed = t.remove(key, (op, msg, at) => {
      if (!t.nodes.has(at)) {
        rec.snap(op, msg, t.state(), { line: 1 });
        return;
      }
      const role: Role =
        op === 'ROTATE' ? 'swap' : op === 'DELETE' ? 'error' : op === 'UPDATE' ? 'error' : 'compare';
      rec.snap(op, msg, t.state({ [at]: role }), {
        line: op === 'ROTATE' ? lineFor(msg) : op === 'UPDATE' ? 3 : 1,
      });
    });
    if (!removed) rec.snap('NOT_FOUND', `${key} not found.`, t.state(), { line: 1 });
    return rec.finish(
      t.inorder(),
      removed ? `Deleted ${key}; tree is balanced.` : 'Nothing deleted.',
      t.state(),
    );
  },
};

export const TREE_ALGORITHMS: AlgorithmDef[] = [
  preorder,
  inorder,
  postorder,
  levelorder,
  treeHeight,
  mirrorTree,
  treeSearch,
  bstInsert,
  bstSearch,
  bstDelete,
  bstMin,
  bstMax,
  bstPredecessor,
  bstSuccessor,
  avlInsert,
  avlDelete,
];
