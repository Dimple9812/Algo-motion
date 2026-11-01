import { ARRAY_ALGORITHMS } from './arrays';
import { DP_ALGORITHMS } from './dp';
import { GRAPH_ALGORITHMS } from './graph';
import { HASH_ALGORITHMS } from './hashTable';
import { HEAP_ALGORITHMS, TRIE_ALGORITHMS } from './heapTrie';
import { LINKED_LIST_ALGORITHMS } from './linkedList';
import { PATTERN_ALGORITHMS } from './patterns';
import { QUEUE_ALGORITHMS } from './queue';
import { RECURSION_ALGORITHMS } from './recursion';
import { SEARCH_ALGORITHMS } from './searching';
import { SORT_ALGORITHMS } from './sorting';
import { STACK_ALGORITHMS } from './stack';
import { TREE_ALGORITHMS } from './trees';
import type { AlgorithmDef, CategoryDef, CategoryId } from './types';

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'arrays',
    name: 'Arrays',
    world: 'Array Adventure',
    character: 'bit',
    blurb: 'Hop across indexed tiles: insert, delete, rotate and merge.',
    accent: '#38bdf8',
  },
  {
    id: 'searching',
    name: 'Searching',
    world: 'Array Adventure',
    character: 'byte',
    blurb: 'Linear scans, binary search and all its bounds.',
    accent: '#22d3ee',
  },
  {
    id: 'sorting',
    name: 'Sorting',
    world: 'Sorting Speedway',
    character: 'loop',
    blurb: 'Eight sorts racing on the same input.',
    accent: '#f472b6',
  },
  {
    id: 'linked-lists',
    name: 'Linked lists',
    world: 'Linked List City',
    character: 'node',
    blurb: 'Singly, doubly and circular lists with live pointer rewiring.',
    accent: '#a78bfa',
  },
  {
    id: 'stacks',
    name: 'Stacks',
    world: 'Stack Tower',
    character: 'bit',
    blurb: 'Push, pop, brackets, postfix and monotonic stacks.',
    accent: '#fb923c',
  },
  {
    id: 'queues',
    name: 'Queues & deques',
    world: 'Queue Express',
    character: 'bit',
    blurb: 'Linear, circular, double-ended and priority queues.',
    accent: '#facc15',
  },
  {
    id: 'hashing',
    name: 'Hash tables',
    world: 'Hash Harbor',
    character: 'byte',
    blurb: 'Buckets, collisions, probing and rehashing.',
    accent: '#4ade80',
  },
  {
    id: 'trees',
    name: 'Trees',
    world: 'Tree Forest',
    character: 'node',
    blurb: 'Traversals, BST operations and AVL rotations.',
    accent: '#34d399',
  },
  {
    id: 'heaps',
    name: 'Heaps',
    world: 'Tree Forest',
    character: 'node',
    blurb: 'Tree and array views of min/max heaps.',
    accent: '#2dd4bf',
  },
  {
    id: 'tries',
    name: 'Tries',
    world: 'Tree Forest',
    character: 'node',
    blurb: 'Prefix trees with shared branches.',
    accent: '#86efac',
  },
  {
    id: 'graphs',
    name: 'Graphs',
    world: 'Graph Galaxy',
    character: 'node',
    blurb: 'Traversals, shortest paths, MSTs and Union-Find.',
    accent: '#818cf8',
  },
  {
    id: 'recursion',
    name: 'Recursion & backtracking',
    world: 'Recursion Mountain',
    character: 'loop',
    blurb: 'Call stacks, choice trees and pruning.',
    accent: '#f87171',
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic programming',
    world: 'DP Lab',
    character: 'pixel',
    blurb: 'Memo tables and tabulation grids, cell by cell.',
    accent: '#e879f9',
  },
  {
    id: 'patterns',
    name: 'Interview patterns',
    world: 'Pattern Plaza',
    character: 'pixel',
    blurb: 'Two pointers, windows, prefix sums, greedy and more.',
    accent: '#fbbf24',
  },
];

export const ALGORITHMS: AlgorithmDef[] = [
  ...ARRAY_ALGORITHMS,
  ...SEARCH_ALGORITHMS,
  ...SORT_ALGORITHMS,
  ...LINKED_LIST_ALGORITHMS,
  ...STACK_ALGORITHMS,
  ...QUEUE_ALGORITHMS,
  ...HASH_ALGORITHMS,
  ...TREE_ALGORITHMS,
  ...HEAP_ALGORITHMS,
  ...TRIE_ALGORITHMS,
  ...GRAPH_ALGORITHMS,
  ...RECURSION_ALGORITHMS,
  ...DP_ALGORITHMS,
  ...PATTERN_ALGORITHMS,
];

const BY_ID = new Map(ALGORITHMS.map((a) => [a.id, a]));

export function getAlgorithm(id: string): AlgorithmDef | undefined {
  return BY_ID.get(id);
}

export function algorithmsIn(category: CategoryId): AlgorithmDef[] {
  return ALGORITHMS.filter((a) => a.category === category);
}

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
