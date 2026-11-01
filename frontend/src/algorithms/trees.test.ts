import { describe, expect, it } from 'vitest';
import {
  AvlTree,
  BTree,
  avlDelete,
  avlInsert,
  bstDelete,
  bstInsert,
  bstMax,
  bstMin,
  bstPredecessor,
  bstSearch,
  bstSuccessor,
  inorder,
  levelorder,
  mirrorTree,
  postorder,
  preorder,
  treeHeight,
  treeSearch,
} from './trees';
import {
  buildHeap,
  buildHeapSilently,
  heapExtract,
  heapInsert,
  heapPeek,
  heapSortTree,
  isHeap,
  trieDelete,
  trieInsert,
  triePrefix,
  trieSearch,
} from './heapTrie';
import { randomInts } from './util';

const T = '1, 2, 3, 4, 5, null, 6';
describe('binary tree', () => {
  it('traversals', () => {
    expect(preorder.run({ tree: T }).result).toEqual([1, 2, 4, 5, 3, 6]);
    expect(inorder.run({ tree: T }).result).toEqual([4, 2, 5, 1, 3, 6]);
    expect(postorder.run({ tree: T }).result).toEqual([4, 5, 2, 6, 3, 1]);
    expect(levelorder.run({ tree: T }).result).toEqual([1, 2, 3, 4, 5, 6]);
    expect(preorder.run({ tree: '' }).result).toEqual([]);
  });
  it('height, count, mirror, search', () => {
    expect(treeHeight.run({ tree: T }).result).toEqual({ height: 3, count: 6 });
    expect(treeHeight.run({ tree: '' }).result).toEqual({ height: 0, count: 0 });
    expect(mirrorTree.run({ tree: '4, 2, 7, 1, 3, 6, 9' }).result).toEqual([9, 7, 6, 4, 3, 2, 1]);
    expect(treeSearch.run({ tree: T, target: 6 }).result).toBe(true);
    expect(treeSearch.run({ tree: T, target: 9 }).result).toBe(false);
  });
  it('rejects malformed input', () => {
    expect(() => preorder.run({ tree: '1, x' })).toThrow();
  });
});

const B = [50, 30, 70, 20, 40, 60, 80];
describe('binary search tree', () => {
  it('insert / search / min / max / neighbours', () => {
    expect(bstInsert.run({ values: B, key: 65 }).result).toEqual([20, 30, 40, 50, 60, 65, 70, 80]);
    expect(bstInsert.run({ values: B, key: 50 }).result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(bstSearch.run({ values: B, key: 60 }).result).toBe(true);
    expect(bstSearch.run({ values: B, key: 65 }).result).toBe(false);
    expect(bstMin.run({ values: B }).result).toBe(20);
    expect(bstMax.run({ values: B }).result).toBe(80);
    expect(bstSuccessor.run({ values: B, key: 40 }).result).toBe(50);
    expect(bstPredecessor.run({ values: B, key: 60 }).result).toBe(50);
    expect(bstSuccessor.run({ values: B, key: 80 }).result).toBeNull();
  });
  it.each([
    [20, 'leaf'],
    [30, 'two children'],
    [50, 'root with two children'],
    [99, 'missing'],
  ])('delete %s (%s) keeps BST order', (key) => {
    const res = bstDelete.run({ values: [...B, 65], key }).result as number[];
    const expected = [...B, 65].filter((x) => x !== key).sort((a, b) => a - b);
    expect(res).toEqual(expected);
  });
  it('delete node with one child', () => {
    expect(bstDelete.run({ values: [50, 30, 20], key: 30 }).result).toEqual([20, 50]);
  });
});

describe('AVL', () => {
  it.each([
    [[30, 20, 10], 'LL'],
    [[10, 20, 30], 'RR'],
    [[30, 10, 20], 'LR'],
    [[10, 30, 20], 'RL'],
  ])('%j triggers %s rotation and stays balanced', (values, kind) => {
    const t = avlInsert.run({ values });
    expect(t.result).toEqual([10, 20, 30]);
    const rot = t.steps
      .filter((s) => s.operation === 'ROTATE')
      .map((s) => s.explanation)
      .join(' ');
    if (kind === 'LR') expect(rot).toMatch(/^LR/);
    if (kind === 'RL') expect(rot).toMatch(/^RL/);
    const last = t.steps.at(-1)!.state;
    expect(last.kind === 'tree' && last.nodes.find((n) => n.id === last.root)!.label).toBe('20');
  });
  it('random sequences stay balanced with correct order', () => {
    for (let s = 1; s < 40; s++) {
      const values = randomInts(s, 15, 1, 60);
      const t = new AvlTree();
      values.forEach((v) => t.insert(v));
      expect(t.isBalanced()).toBe(true);
      expect(t.inorder()).toEqual([...new Set(values)].sort((a, b) => a - b));
      const del = values.slice(0, 5);
      del.forEach((v) => t.remove(v));
      expect(t.isBalanced()).toBe(true);
      expect(t.inorder()).toEqual([...new Set(values)].filter((v) => !del.includes(v)).sort((a, b) => a - b));
    }
  });
  it('delete trace', () => {
    expect(avlDelete.run({ values: [50, 30, 70, 20, 40, 80, 10], key: 70 }).result).toEqual([
      10, 20, 30, 40, 50, 80,
    ]);
  });
  it('BTree level order builder handles gaps', () => {
    const t = BTree.fromLevelOrder([1, null, 2, 3]);
    expect(t.inorder()).toEqual([1, 3, 2]);
  });
});

describe('heaps', () => {
  it('build/insert/extract maintain the heap property', () => {
    for (let s = 1; s < 20; s++) {
      const v = randomInts(s, 10);
      expect(isHeap(buildHeapSilently(v, 'min'), 'min')).toBe(true);
      expect(isHeap(buildHeap.run({ kind: 'max', values: v }).result as number[], 'max')).toBe(true);
      expect(isHeap(heapInsert.run({ kind: 'min', values: v, value: 0 }).result as number[], 'min')).toBe(
        true,
      );
      expect(heapExtract.run({ kind: 'max', values: v }).result).toBe(Math.max(...v));
      expect(heapSortTree.run({ values: v }).result).toEqual([...v].sort((a, b) => a - b));
    }
    expect(heapPeek.run({ kind: 'min', values: [7, 3, 9] }).result).toBe(3);
    expect(heapExtract.run({ kind: 'min', values: [] }).result).toBeNull();
  });
  it('heap state shows the array alongside the tree', () => {
    const st = heapInsert.run({ kind: 'min', values: [3, 5], value: 1 }).steps[0].state;
    expect(st.kind === 'tree' && st.array).toEqual([3, 5]);
  });
});

describe('tries', () => {
  const words = ['car', 'cart', 'care', 'cat', 'dog'];
  it('insert/search/prefix/delete', () => {
    expect(trieInsert.run({ words }).result).toEqual(['car', 'care', 'cart', 'cat', 'dog']);
    expect(trieSearch.run({ words, query: 'care' }).result).toBe(true);
    expect(trieSearch.run({ words, query: 'ca' }).result).toBe(false);
    expect(triePrefix.run({ words, query: 'ca' }).result).toBe(true);
    expect(triePrefix.run({ words, query: 'z' }).result).toBe(false);
    expect(trieDelete.run({ words, query: 'cart' }).result).toEqual(['car', 'care', 'cat', 'dog']);
    expect(trieDelete.run({ words, query: 'car' }).result).toEqual(['care', 'cart', 'cat', 'dog']);
    expect(trieDelete.run({ words, query: 'ca' }).result).toEqual(['car', 'care', 'cart', 'cat', 'dog']);
  });
  it('shared prefixes are marked', () => {
    const st = trieInsert.run({ words: ['car', 'cat'] }).steps.at(-1)!.state;
    expect(st.kind === 'tree' && st.nodes.some((n) => n.badge === 'shared')).toBe(true);
  });
});
