/**
 * AlgoMotion trace schema v1.0
 *
 * A trace is the complete, deterministic record of an algorithm execution.
 * Every step stores a full snapshot of the visual state, so seeking to any
 * step is an O(1) lookup and can never drift from the real execution.
 * The renderer only ever reads snapshots; it never re-runs algorithm logic.
 */

export const TRACE_SCHEMA_VERSION = '1.0' as const;

export const OPERATIONS = [
  'INIT',
  'READ',
  'COMPARE',
  'SWAP',
  'WRITE',
  'SHIFT',
  'INSERT',
  'DELETE',
  'UPDATE',
  'POINTER_MOVE',
  'FOUND',
  'NOT_FOUND',
  'PUSH',
  'POP',
  'PEEK',
  'ENQUEUE',
  'DEQUEUE',
  'OVERFLOW',
  'UNDERFLOW',
  'HASH',
  'COLLISION',
  'PROBE',
  'RESIZE',
  'VISIT',
  'RELAX',
  'ROTATE',
  'HEAPIFY',
  'CALL',
  'RETURN',
  'DP_UPDATE',
  'MARK_SORTED',
  'PARTITION',
  'MERGE',
  'SELECT_EDGE',
  'REJECT_EDGE',
  'UNION',
  'FIND',
  'ERROR',
  'DONE',
] as const;

export type Operation = (typeof OPERATIONS)[number];

export type Primitive = string | number | boolean | null;
export type VarValue = Primitive | Primitive[] | Record<string, Primitive | Primitive[]>;

/** Visual roles. Every role has a colour AND a text/shape marker so state is never colour-only. */
export type Role =
  | 'active'
  | 'compare'
  | 'swap'
  | 'write'
  | 'visited'
  | 'found'
  | 'sorted'
  | 'pivot'
  | 'error'
  | 'muted'
  | 'path'
  | 'frontier';

export interface Highlight {
  index: number;
  role: Role;
}

export interface Pointer {
  name: string;
  /** index for arrays, node id for linked structures */
  at: number | string;
}

export interface ArrayState {
  kind: 'array';
  values: (number | string | null)[];
  highlights: Highlight[];
  pointers: Pointer[];
  ranges?: { from: number; to: number; label: string }[];
  aux?: { label: string; values: (number | string | null)[]; highlights?: Highlight[] }[];
}

export interface ListNode {
  id: string;
  value: number | string;
}

export interface LinkedListState {
  kind: 'linkedList';
  variant: 'singly' | 'doubly' | 'circular';
  nodes: ListNode[];
  next: Record<string, string | null>;
  prev?: Record<string, string | null>;
  head: string | null;
  tail: string | null;
  pointers: Pointer[];
  nodeRoles: Record<string, Role>;
  /** edges (from->to) to emphasise because they just changed */
  changedEdges?: string[];
}

export interface StackState {
  kind: 'stack';
  items: (number | string)[];
  capacity: number | null;
  highlights: Highlight[];
  /** e.g. postfix output or expression being scanned */
  tape?: { label: string; tokens: string[]; cursor: number | null };
  output?: { label: string; tokens: string[] };
  /** optional secondary stack, e.g. min stack */
  side?: { label: string; items: (number | string)[] };
}

export interface QueueState {
  kind: 'queue';
  variant: 'linear' | 'circular' | 'deque' | 'priority';
  slots: (number | string | null)[];
  front: number;
  rear: number;
  size: number;
  capacity: number;
  highlights: Highlight[];
}

export interface HashEntry {
  key: string;
  value: number | string;
}

export interface HashState {
  kind: 'hash';
  strategy: 'chaining' | 'linear-probing';
  buckets: (HashEntry[] | HashEntry | null | 'TOMBSTONE')[];
  activeBucket: number | null;
  activeKey: string | null;
  bucketRoles: Record<number, Role>;
  size: number;
  collisions: number;
  loadFactor: number;
  hashCalc?: string;
}

export interface TreeNodeView {
  id: string;
  label: string;
  /** binary trees use [left, right] with nulls; tries use any number of children */
  children: (string | null)[];
  edgeLabels?: (string | null)[];
  badge?: string;
  terminal?: boolean;
}

export interface TreeState {
  kind: 'tree';
  variant: 'binary' | 'bst' | 'avl' | 'heap' | 'trie';
  nodes: TreeNodeView[];
  root: string | null;
  nodeRoles: Record<string, Role>;
  pointers: Pointer[];
  /** heap array representation, rendered beside the tree */
  array?: (number | string)[];
  arrayHighlights?: Highlight[];
  output?: { label: string; tokens: string[] };
}

export interface GraphNodeView {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdgeView {
  id: string;
  from: string;
  to: string;
  weight?: number;
}

export interface GraphState {
  kind: 'graph';
  directed: boolean;
  weighted: boolean;
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  nodeRoles: Record<string, Role>;
  edgeRoles: Record<string, Role>;
  nodeLabels: Record<string, string>;
  frontier?: { label: string; items: string[] };
  output?: { label: string; tokens: string[] };
  matrix?: { labels: string[]; cells: (number | null)[][]; active?: [number, number] | null };
}

export interface GridState {
  kind: 'grid';
  cells: (number | string | null)[][];
  rowLabels?: string[];
  colLabels?: string[];
  highlights: { r: number; c: number; role: Role }[];
  caption?: string;
}

export interface CallFrame {
  id: string;
  label: string;
  depth: number;
  status: 'active' | 'waiting' | 'returned' | 'base';
  returnValue?: string;
  parent: string | null;
}

export interface RecursionState {
  kind: 'recursion';
  frames: CallFrame[];
  stack: string[];
  output?: { label: string; tokens: string[] };
  grid?: GridState;
}

export type VisualState =
  | ArrayState
  | LinkedListState
  | StackState
  | QueueState
  | HashState
  | TreeState
  | GraphState
  | GridState
  | RecursionState;

export type VisualKind = VisualState['kind'];

export interface TraceStep<S extends VisualState = VisualState> {
  step: number;
  operation: Operation;
  explanation: string;
  /** 1-based line in the algorithm's pseudocode */
  line: number | null;
  variables: Record<string, VarValue>;
  state: S;
  done: boolean;
}

export interface TraceMetrics {
  comparisons: number;
  swaps: number;
  writes: number;
  reads: number;
}

export interface Trace<S extends VisualState = VisualState> {
  schemaVersion: typeof TRACE_SCHEMA_VERSION;
  algorithm: string;
  input: Record<string, unknown>;
  steps: TraceStep<S>[];
  result: VarValue | undefined;
  metrics: TraceMetrics;
}
