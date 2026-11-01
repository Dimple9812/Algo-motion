import { InputError, TraceRecorder } from '@/engine/recorder';
import type { GraphEdgeView, GraphNodeView, GraphState, Role } from '@/engine/types';
import type { AlgorithmDef, AlgoInput, InputField } from './types';
import { str } from './util';

export interface GraphModel {
  directed: boolean;
  weighted: boolean;
  nodes: string[];
  edges: { id: string; from: string; to: string; w: number }[];
}

/** Parse "A-B:4, B-C" into a graph. Node names are 1–3 alphanumerics. */
export function parseGraph(text: string, directed: boolean, extraNodes: string[] = []): GraphModel {
  const parts = text
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 30) throw new InputError('At most 30 edges.');
  const nodes = new Set<string>(extraNodes);
  let weighted = false;
  const edges = parts.map((p, i) => {
    const m = /^([A-Za-z0-9]{1,3})\s*[-–>]+\s*([A-Za-z0-9]{1,3})(?:\s*:\s*(-?\d{1,4}))?$/.exec(p);
    if (!m) throw new InputError(`Cannot parse edge "${p}". Use A-B or A-B:4.`);
    const [, a, b, w] = m;
    if (a === b) throw new InputError(`Self-loop ${a}-${b} is not supported.`);
    if (w !== undefined) weighted = true;
    nodes.add(a);
    nodes.add(b);
    return { id: `e${i}`, from: a, to: b, w: w === undefined ? 1 : Number(w) };
  });
  if (nodes.size > 12) throw new InputError('At most 12 vertices.');
  return {
    directed,
    weighted,
    nodes: [...nodes].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })),
    edges,
  };
}

export function layout(nodes: string[]): GraphNodeView[] {
  const n = nodes.length;
  return nodes.map((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return {
      id,
      label: id,
      x: Math.round(50 + 38 * Math.cos(angle)),
      y: Math.round(50 + 38 * Math.sin(angle)),
    };
  });
}

/** Adjacency list with edge ids. Undirected edges appear in both directions. */
export function adjacency(g: GraphModel): Map<string, { to: string; w: number; edge: string }[]> {
  const adj = new Map<string, { to: string; w: number; edge: string }[]>(g.nodes.map((n) => [n, []]));
  for (const e of g.edges) {
    adj.get(e.from)!.push({ to: e.to, w: e.w, edge: e.id });
    if (!g.directed) adj.get(e.to)!.push({ to: e.from, w: e.w, edge: e.id });
  }
  adj.forEach((list) => list.sort((a, b) => a.to.localeCompare(b.to, undefined, { numeric: true })));
  return adj;
}

class GraphView {
  nodeRoles: Record<string, Role> = {};
  edgeRoles: Record<string, Role> = {};
  nodeLabels: Record<string, string> = {};
  readonly layoutNodes: GraphNodeView[];
  readonly edgeViews: GraphEdgeView[];
  constructor(readonly g: GraphModel) {
    this.layoutNodes = layout(g.nodes);
    this.edgeViews = g.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      weight: g.weighted ? e.w : undefined,
    }));
  }
  state(
    extra: Partial<GraphState> = {},
    transient: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {},
  ): GraphState {
    return {
      kind: 'graph',
      directed: this.g.directed,
      weighted: this.g.weighted,
      nodes: this.layoutNodes,
      edges: this.edgeViews,
      nodeRoles: { ...this.nodeRoles, ...transient.nodes },
      edgeRoles: { ...this.edgeRoles, ...transient.edges },
      nodeLabels: { ...this.nodeLabels },
      ...extra,
    };
  }
}

const PRESETS: Record<string, { label: string; edges: string; directed: boolean; start: string }> = {
  campus: {
    label: 'Small campus (undirected, weighted)',
    edges: 'A-B:4, A-C:2, B-C:5, B-D:10, C-E:3, E-D:4, D-F:11',
    directed: false,
    start: 'A',
  },
  social: {
    label: 'Friends network (unweighted)',
    edges: 'A-B, A-C, B-D, C-D, D-E, E-F, G-H',
    directed: false,
    start: 'A',
  },
  courses: {
    label: 'Course prerequisites (DAG)',
    edges: 'A>C, B>C, B>D, C>E, D>F, E>F, F>G',
    directed: true,
    start: 'A',
  },
  cyclic: { label: 'Directed with a cycle', edges: 'A>B, B>C, C>D, D>B, D>E', directed: true, start: 'A' },
  negative: {
    label: 'Directed, negative edge',
    edges: 'S>A:4, S>B:5, A>C:-3, B>A:-2, C>D:2, B>D:6',
    directed: true,
    start: 'S',
  },
};

export const GRAPH_PRESETS = PRESETS;

const graphInputs = (startLabel = 'Start vertex'): InputField[] => [
  { key: 'edges', label: 'Edges (A-B:weight)', type: 'text', maxLength: 300 },
  {
    key: 'directed',
    label: 'Edges are',
    type: 'select',
    options: [
      { value: 'false', label: 'Undirected' },
      { value: 'true', label: 'Directed' },
    ],
  },
  { key: 'start', label: startLabel, type: 'text', maxLength: 3 },
];

function readGraph(input: AlgoInput): GraphModel {
  return parseGraph(str(input, 'edges', 300), String(input.directed) === 'true');
}

function readStart(input: AlgoInput, g: GraphModel): string {
  const s = str(input, 'start', 3).trim();
  if (!g.nodes.includes(s)) throw new InputError(`Start vertex "${s}" is not in the graph.`);
  return s;
}

const preset = (k: keyof typeof PRESETS): AlgoInput => ({
  edges: PRESETS[k].edges,
  directed: String(PRESETS[k].directed),
  start: PRESETS[k].start,
});
const VE = { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' };

export const bfs: AlgorithmDef = {
  id: 'graph-bfs',
  name: 'Breadth-first search',
  category: 'graphs',
  visual: 'graph',
  summary: 'Explore in waves using a FIFO queue; in unweighted graphs this finds shortest hop counts.',
  pseudocode: [
    'visited = {start}; queue = [start]',
    'while queue not empty:',
    '    u = queue.dequeue(); visit(u)',
    '    for v in neighbours(u) (alphabetical):',
    '        if v not visited: visited.add(v); queue.enqueue(v)',
  ],
  complexity: { time: VE, space: 'O(V)' },
  assumptions: ['Neighbours are explored in alphabetical order so the trace is deterministic.'],
  inputs: graphInputs(),
  defaultInput: preset('social'),
  run(input) {
    const g = readGraph(input);
    const start = readStart(input, g);
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-bfs', { ...input });
    const order: string[] = [];
    const queue = [start];
    const seen = new Set([start]);
    v.nodeRoles[start] = 'frontier';
    v.nodeLabels[start] = 'd=0';
    const dist: Record<string, number> = { [start]: 0 };
    const snap = (
      op: Parameters<typeof rec.snap>[0],
      msg: string,
      line: number,
      t: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {},
    ) =>
      rec.snap(
        op,
        msg,
        v.state(
          {
            frontier: { label: 'queue', items: [...queue] },
            output: { label: 'visit order', tokens: [...order] },
          },
          t,
        ),
        { line, vars: { queue: [...queue], visited: [...seen] } },
      );
    snap('INIT', `Enqueue start vertex ${start}.`, 1);
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u);
      v.nodeRoles[u] = 'visited';
      snap('VISIT', `Dequeue ${u} and visit it.`, 3, { nodes: { [u]: 'active' } });
      for (const { to, edge } of adj.get(u)!) {
        if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
          dist[to] = dist[u] + 1;
          v.nodeRoles[to] = 'frontier';
          v.nodeLabels[to] = `d=${dist[to]}`;
          v.edgeRoles[edge] = 'path';
          snap('ENQUEUE', `${to} is new — mark visited and enqueue (distance ${dist[to]}).`, 5, {
            nodes: { [u]: 'active' },
            edges: { [edge]: 'active' },
          });
        } else {
          snap('COMPARE', `${to} already discovered — skip.`, 4, {
            nodes: { [u]: 'active', [to]: 'muted' },
            edges: { [edge]: 'compare' },
          });
        }
      }
    }
    const unreachable = g.nodes.filter((n) => !seen.has(n));
    unreachable.forEach((n) => (v.nodeRoles[n] = 'muted'));
    return rec.finish(
      order,
      `BFS order: ${order.join(' → ')}.${unreachable.length ? ` Unreachable: ${unreachable.join(', ')}.` : ''}`,
      v.state({ output: { label: 'visit order', tokens: order } }),
    );
  },
};

export const dfs: AlgorithmDef = {
  id: 'graph-dfs',
  name: 'Depth-first search',
  category: 'graphs',
  visual: 'graph',
  summary: 'Go as deep as possible along each branch before backtracking (recursive).',
  pseudocode: [
    'dfs(u):',
    '    visited.add(u); visit(u)',
    '    for v in neighbours(u) (alphabetical):',
    '        if v not visited: dfs(v)',
    '    backtrack',
  ],
  complexity: { time: VE, space: 'O(V) recursion' },
  inputs: graphInputs(),
  defaultInput: preset('social'),
  run(input) {
    const g = readGraph(input);
    const start = readStart(input, g);
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-dfs', { ...input });
    const order: string[] = [];
    const stack: string[] = [];
    const seen = new Set<string>();
    const snap = (
      op: Parameters<typeof rec.snap>[0],
      msg: string,
      line: number,
      t: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {},
    ) =>
      rec.snap(
        op,
        msg,
        v.state(
          {
            frontier: { label: 'call stack', items: [...stack] },
            output: { label: 'visit order', tokens: [...order] },
          },
          t,
        ),
        { line, vars: { stack: [...stack] } },
      );
    snap('INIT', `Start DFS at ${start}.`, 1);
    const go = (u: string) => {
      seen.add(u);
      stack.push(u);
      order.push(u);
      v.nodeRoles[u] = 'frontier';
      snap('VISIT', `Visit ${u} (depth ${stack.length - 1}).`, 2, { nodes: { [u]: 'active' } });
      for (const { to, edge } of adj.get(u)!) {
        if (!seen.has(to)) {
          v.edgeRoles[edge] = 'path';
          snap('POINTER_MOVE', `Go deeper: ${u} → ${to}.`, 4, {
            nodes: { [u]: 'active' },
            edges: { [edge]: 'active' },
          });
          go(to);
        } else
          snap('COMPARE', `${to} already visited — skip edge ${u}–${to}.`, 3, {
            nodes: { [u]: 'active' },
            edges: { [edge]: 'compare' },
          });
      }
      stack.pop();
      v.nodeRoles[u] = 'visited';
      snap('RETURN', `All neighbours of ${u} done — backtrack.`, 5);
    };
    go(start);
    const unreachable = g.nodes.filter((n) => !seen.has(n));
    unreachable.forEach((n) => (v.nodeRoles[n] = 'muted'));
    return rec.finish(
      order,
      `DFS order: ${order.join(' → ')}.${unreachable.length ? ` Unreachable: ${unreachable.join(', ')}.` : ''}`,
      v.state({ output: { label: 'visit order', tokens: order } }),
    );
  },
};

function distLabel(d: number) {
  return d === Infinity ? '∞' : String(d);
}

export const dijkstra: AlgorithmDef = {
  id: 'graph-dijkstra',
  name: "Dijkstra's shortest paths",
  category: 'graphs',
  visual: 'graph',
  summary: 'Repeatedly settle the closest unsettled vertex and relax its outgoing edges.',
  pseudocode: [
    'dist[*] = ∞; dist[start] = 0; pq = {(0, start)}',
    'while pq not empty:',
    '    (d, u) = pq.popMin(); if u settled: continue',
    '    settle u',
    '    for (v, w) in neighbours(u):',
    '        if dist[u] + w < dist[v]: dist[v] = dist[u] + w; prev[v] = u; pq.push(v)',
  ],
  complexity: {
    time: { best: 'O((V + E) log V)', average: 'O((V + E) log V)', worst: 'O((V + E) log V)' },
    space: 'O(V)',
  },
  assumptions: [
    'All edge weights must be non-negative. Dijkstra is rejected for negative weights — use Bellman-Ford.',
  ],
  inputs: graphInputs(),
  defaultInput: preset('campus'),
  run(input) {
    const g = readGraph(input);
    const start = readStart(input, g);
    const neg = g.edges.find((e) => e.w < 0);
    if (neg)
      throw new InputError(
        `Dijkstra requires non-negative weights, but ${neg.from}-${neg.to} has weight ${neg.w}. Use Bellman-Ford instead.`,
      );
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-dijkstra', { ...input });
    const dist: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, Infinity]));
    const prevEdge: Record<string, string | null> = {};
    dist[start] = 0;
    const settled = new Set<string>();
    const pq: [number, string][] = [[0, start]];
    const labels = () => g.nodes.forEach((n) => (v.nodeLabels[n] = distLabel(dist[n])));
    const pqItems = () =>
      [...pq].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map(([d, n]) => `${n}:${d}`);
    const snap = (
      op: Parameters<typeof rec.snap>[0],
      msg: string,
      line: number,
      t: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {},
    ) => {
      labels();
      rec.snap(op, msg, v.state({ frontier: { label: 'priority queue', items: pqItems() } }, t), {
        line,
        vars: { settled: [...settled] },
      });
    };
    snap('INIT', `dist[${start}] = 0, all others ∞.`, 1);
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
      const [d, u] = pq.shift()!;
      if (settled.has(u)) {
        snap('COMPARE', `(${u}, ${d}) is stale — ${u} is already settled.`, 3);
        continue;
      }
      settled.add(u);
      v.nodeRoles[u] = 'visited';
      if (prevEdge[u]) v.edgeRoles[prevEdge[u]!] = 'path';
      snap('VISIT', `Settle ${u} with distance ${d}.`, 4, { nodes: { [u]: 'active' } });
      for (const { to, w, edge } of adj.get(u)!) {
        if (settled.has(to)) continue;
        const cand = dist[u] + w;
        if (cand < dist[to]) {
          dist[to] = cand;
          prevEdge[to] = edge;
          pq.push([cand, to]);
          v.nodeRoles[to] = 'frontier';
          snap('RELAX', `Relax ${u}→${to}: ${dist[u]} + ${w} = ${cand} improves the distance.`, 6, {
            nodes: { [u]: 'active', [to]: 'write' },
            edges: { [edge]: 'active' },
          });
        } else {
          snap(
            'COMPARE',
            `${u}→${to}: ${dist[u]} + ${w} = ${cand} is not better than ${distLabel(dist[to])}.`,
            6,
            { nodes: { [u]: 'active', [to]: 'compare' }, edges: { [edge]: 'compare' } },
          );
        }
      }
    }
    g.nodes.filter((n) => dist[n] === Infinity).forEach((n) => (v.nodeRoles[n] = 'muted'));
    const result: Record<string, number | null> = Object.fromEntries(
      g.nodes.map((n) => [n, dist[n] === Infinity ? null : dist[n]]),
    );
    labels();
    return rec.finish(
      result,
      `Shortest distances from ${start}: ${g.nodes.map((n) => `${n}=${distLabel(dist[n])}`).join(', ')}.`,
      v.state(),
    );
  },
};

export const bellmanFord: AlgorithmDef = {
  id: 'graph-bellman-ford',
  name: 'Bellman-Ford',
  category: 'graphs',
  visual: 'graph',
  summary: 'Relax every edge V − 1 times; a further improvement proves a negative cycle.',
  pseudocode: [
    'dist[*] = ∞; dist[start] = 0',
    'repeat V - 1 times:',
    '    for each edge (u, v, w):',
    '        if dist[u] + w < dist[v]: dist[v] = dist[u] + w',
    'for each edge: if it can still relax → negative cycle',
  ],
  complexity: { time: { best: 'O(E)', average: 'O(V·E)', worst: 'O(V·E)' }, space: 'O(V)' },
  assumptions: [
    'Handles negative weights. For undirected graphs a negative edge is itself a negative cycle.',
  ],
  inputs: graphInputs(),
  defaultInput: preset('negative'),
  run(input) {
    const g = readGraph(input);
    const start = readStart(input, g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-bellman-ford', { ...input });
    const dist: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, Infinity]));
    dist[start] = 0;
    const directedEdges = g.edges.flatMap((e) => (g.directed ? [e] : [e, { ...e, from: e.to, to: e.from }]));
    const labels = () => g.nodes.forEach((n) => (v.nodeLabels[n] = distLabel(dist[n])));
    labels();
    rec.snap('INIT', `dist[${start}] = 0.`, v.state(), { line: 1 });
    for (let round = 1; round < g.nodes.length; round++) {
      let changed = false;
      for (const e of directedEdges) {
        if (dist[e.from] === Infinity) continue;
        const cand = dist[e.from] + e.w;
        if (cand < dist[e.to]) {
          dist[e.to] = cand;
          changed = true;
          labels();
          rec.snap(
            'RELAX',
            `Round ${round}: relax ${e.from}→${e.to} (w=${e.w}); dist[${e.to}] = ${cand}.`,
            v.state({}, { nodes: { [e.to]: 'write', [e.from]: 'active' }, edges: { [e.id]: 'active' } }),
            { line: 4, vars: { round } },
          );
        }
      }
      rec.snap(
        'UPDATE',
        `Round ${round} finished${changed ? '' : ' with no changes — stop early'}.`,
        v.state(),
        { line: 2, vars: { round, changed } },
      );
      if (!changed) break;
    }
    for (const e of directedEdges) {
      if (dist[e.from] !== Infinity && dist[e.from] + e.w < dist[e.to]) {
        rec.snap(
          'ERROR',
          `Edge ${e.from}→${e.to} can still be relaxed — negative cycle reachable from ${start}.`,
          v.state({}, { edges: { [e.id]: 'error' }, nodes: { [e.to]: 'error' } }),
          { line: 5 },
        );
        return rec.finish(
          'negative-cycle',
          'Negative cycle detected; shortest paths are undefined.',
          v.state(),
        );
      }
    }
    g.nodes.forEach((n) => (v.nodeRoles[n] = dist[n] === Infinity ? 'muted' : 'visited'));
    const result: Record<string, number | null> = Object.fromEntries(
      g.nodes.map((n) => [n, dist[n] === Infinity ? null : dist[n]]),
    );
    return rec.finish(
      result,
      `Distances: ${g.nodes.map((n) => `${n}=${distLabel(dist[n])}`).join(', ')}.`,
      v.state(),
    );
  },
};

export const floydWarshall: AlgorithmDef = {
  id: 'graph-floyd-warshall',
  name: 'Floyd-Warshall',
  category: 'graphs',
  visual: 'graph',
  summary: 'All-pairs shortest paths: allow each vertex k in turn as an intermediate stop.',
  pseudocode: [
    'd[i][j] = w(i, j) or ∞; d[i][i] = 0',
    'for k in V:',
    '    for i in V: for j in V:',
    '        if d[i][k] + d[k][j] < d[i][j]: d[i][j] = d[i][k] + d[k][j]',
  ],
  complexity: { time: { best: 'O(V³)', average: 'O(V³)', worst: 'O(V³)' }, space: 'O(V²)' },
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: { edges: 'A>B:3, A>C:8, B>C:2, C>D:1, D>A:4, B>D:7', directed: 'true', start: 'A' },
  run(input) {
    const g = readGraph(input);
    if (g.nodes.length > 7) throw new InputError('Floyd-Warshall visualizer supports at most 7 vertices.');
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-floyd-warshall', { ...input });
    const n = g.nodes.length;
    const idx = Object.fromEntries(g.nodes.map((x, i) => [x, i]));
    const d: (number | null)[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 0 : null)),
    );
    for (const e of g.edges) {
      const [a, b] = [idx[e.from], idx[e.to]];
      if (d[a][b] === null || e.w < d[a][b]!) d[a][b] = e.w;
      if (!g.directed && (d[b][a] === null || e.w < d[b][a]!)) d[b][a] = e.w;
    }
    const mat = (active: [number, number] | null = null) => ({
      matrix: { labels: g.nodes, cells: d.map((r) => [...r]), active },
    });
    rec.snap('INIT', 'Initial distance matrix from direct edges.', v.state(mat()), { line: 1 });
    for (let k = 0; k < n; k++) {
      rec.snap(
        'UPDATE',
        `Allow paths through ${g.nodes[k]}.`,
        v.state(mat(), { nodes: { [g.nodes[k]]: 'pivot' } }),
        { line: 2, vars: { k: g.nodes[k] } },
      );
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (i === j || d[i][k] === null || d[k][j] === null) continue;
          const cand = d[i][k]! + d[k][j]!;
          if (d[i][j] === null || cand < d[i][j]!) {
            const old = d[i][j];
            d[i][j] = cand;
            rec.snap(
              'DP_UPDATE',
              `${g.nodes[i]}→${g.nodes[k]}→${g.nodes[j]} = ${cand} beats ${old ?? '∞'}.`,
              v.state(mat([i, j]), {
                nodes: { [g.nodes[k]]: 'pivot', [g.nodes[i]]: 'active', [g.nodes[j]]: 'write' },
              }),
              { line: 4, vars: { k: g.nodes[k], i: g.nodes[i], j: g.nodes[j] } },
            );
          }
        }
    }
    for (let i = 0; i < n; i++)
      if (d[i][i]! < 0) {
        rec.snap('ERROR', `d[${g.nodes[i]}][${g.nodes[i]}] < 0 — negative cycle.`, v.state(mat([i, i])), {
          line: 4,
        });
        return rec.finish('negative-cycle', 'Negative cycle detected.', v.state(mat()));
      }
    return rec.finish(
      d.map((r) => r.map((x) => (x === null ? '∞' : String(x))).join(' ')),
      'All-pairs shortest distances computed.',
      v.state(mat()),
    );
  },
};

export const topoSort: AlgorithmDef = {
  id: 'graph-topological-sort',
  name: "Topological sort (Kahn's)",
  category: 'graphs',
  visual: 'graph',
  summary: 'Repeatedly output a vertex with in-degree 0 and remove its outgoing edges.',
  pseudocode: [
    'compute indegree of every vertex',
    'queue = vertices with indegree 0',
    'while queue: u = dequeue; output u',
    '    for v in out(u): indegree[v]--; if 0: enqueue v',
    'if output size < V: graph has a cycle',
  ],
  complexity: { time: VE, space: 'O(V)' },
  assumptions: ['Requires a directed graph. A cycle makes a topological order impossible.'],
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: preset('courses'),
  run(input) {
    const g = readGraph(input);
    if (!g.directed) throw new InputError('Topological sort needs a directed graph.');
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-topological-sort', { ...input });
    const indeg: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, 0]));
    g.edges.forEach((e) => indeg[e.to]++);
    const labels = () => g.nodes.forEach((n) => (v.nodeLabels[n] = `in=${indeg[n]}`));
    labels();
    const queue = g.nodes.filter((n) => indeg[n] === 0);
    const out: string[] = [];
    queue.forEach((n) => (v.nodeRoles[n] = 'frontier'));
    const snap = (
      op: Parameters<typeof rec.snap>[0],
      msg: string,
      line: number,
      t: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {},
    ) => {
      labels();
      rec.snap(
        op,
        msg,
        v.state(
          { frontier: { label: 'queue', items: [...queue] }, output: { label: 'order', tokens: [...out] } },
          t,
        ),
        { line },
      );
    };
    snap('INIT', `Vertices with in-degree 0: ${queue.join(', ') || 'none'}.`, 2);
    while (queue.length) {
      queue.sort();
      const u = queue.shift()!;
      out.push(u);
      v.nodeRoles[u] = 'visited';
      snap('VISIT', `Output ${u}.`, 3, { nodes: { [u]: 'active' } });
      for (const { to, edge } of adj.get(u)!) {
        indeg[to]--;
        v.edgeRoles[edge] = 'muted';
        if (indeg[to] === 0) {
          queue.push(to);
          v.nodeRoles[to] = 'frontier';
        }
        snap(
          'UPDATE',
          `Remove ${u}→${to}; in-degree of ${to} is now ${indeg[to]}${indeg[to] === 0 ? ' — enqueue it' : ''}.`,
          4,
          { edges: { [edge]: 'active' }, nodes: { [to]: 'write' } },
        );
      }
    }
    if (out.length < g.nodes.length) {
      const stuck = g.nodes.filter((n) => !out.includes(n));
      stuck.forEach((n) => (v.nodeRoles[n] = 'error'));
      snap('ERROR', `Vertices ${stuck.join(', ')} never reach in-degree 0 — the graph has a cycle.`, 5);
      return rec.finish('cycle', 'No topological order exists.', v.state());
    }
    return rec.finish(
      out,
      `Topological order: ${out.join(' → ')}.`,
      v.state({ output: { label: 'order', tokens: out } }),
    );
  },
};

export const directedCycle: AlgorithmDef = {
  id: 'graph-directed-cycle',
  name: 'Cycle detection (directed)',
  category: 'graphs',
  visual: 'graph',
  summary:
    'DFS with three colours: reaching a grey vertex (on the current path) means a back edge, i.e. a cycle.',
  pseudocode: [
    'colour[*] = white',
    'dfs(u): colour[u] = grey',
    '    for v in out(u):',
    '        if colour[v] == grey: cycle found',
    '        if colour[v] == white: dfs(v)',
    '    colour[u] = black',
  ],
  complexity: { time: VE, space: 'O(V)' },
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: preset('cyclic'),
  run(input) {
    const g = readGraph(input);
    if (!g.directed) throw new InputError('Use the undirected cycle detector for undirected graphs.');
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-directed-cycle', { ...input });
    const colour: Record<string, 'white' | 'grey' | 'black'> = Object.fromEntries(
      g.nodes.map((n) => [n, 'white']),
    );
    const path: string[] = [];
    rec.snap('INIT', 'All vertices start white (unvisited).', v.state(), { line: 1 });
    let found = false;
    const go = (u: string) => {
      colour[u] = 'grey';
      path.push(u);
      v.nodeRoles[u] = 'frontier';
      rec.snap(
        'VISIT',
        `${u} turns grey (on the current path).`,
        v.state({ frontier: { label: 'path', items: [...path] } }),
        { line: 2 },
      );
      for (const { to, edge } of adj.get(u)!) {
        if (found) return;
        if (colour[to] === 'grey') {
          found = true;
          v.edgeRoles[edge] = 'error';
          v.nodeRoles[to] = 'error';
          rec.snap(
            'FOUND',
            `Edge ${u}→${to} reaches grey ${to}: back edge, so there is a cycle.`,
            v.state({ frontier: { label: 'path', items: [...path] } }),
            { line: 4 },
          );
          return;
        }
        if (colour[to] === 'white') {
          v.edgeRoles[edge] = 'path';
          go(to);
        }
      }
      if (found) return;
      colour[u] = 'black';
      path.pop();
      v.nodeRoles[u] = 'visited';
      rec.snap(
        'RETURN',
        `${u} is finished (black).`,
        v.state({ frontier: { label: 'path', items: [...path] } }),
        { line: 6 },
      );
    };
    for (const n of g.nodes) if (!found && colour[n] === 'white') go(n);
    if (!found) rec.snap('NOT_FOUND', 'No back edges — the graph is acyclic.', v.state(), { line: 6 });
    return rec.finish(found, found ? 'Cycle detected.' : 'No cycle.', v.state());
  },
};

export class UnionFind {
  parent: Record<string, string> = {};
  rank: Record<string, number> = {};
  constructor(items: string[]) {
    items.forEach((x) => {
      this.parent[x] = x;
      this.rank[x] = 0;
    });
  }
  find(x: string): string {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a: string, b: string): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

export const undirectedCycle: AlgorithmDef = {
  id: 'graph-undirected-cycle',
  name: 'Cycle detection (undirected)',
  category: 'graphs',
  visual: 'graph',
  summary: 'Union-Find over the edges: an edge joining two vertices already in the same set closes a cycle.',
  pseudocode: [
    'make each vertex its own set',
    'for edge (u, v):',
    '    if find(u) == find(v): cycle found',
    '    else union(u, v)',
  ],
  complexity: { time: { best: 'O(E α(V))', average: 'O(E α(V))', worst: 'O(E α(V))' }, space: 'O(V)' },
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: { edges: 'A-B, B-C, C-D, D-B, D-E', directed: 'false', start: 'A' },
  run(input) {
    const g = readGraph(input);
    if (g.directed) throw new InputError('Use the directed cycle detector for directed graphs.');
    const v = new GraphView(g);
    const uf = new UnionFind(g.nodes);
    const rec = new TraceRecorder<GraphState>('graph-undirected-cycle', { ...input });
    const labels = () => g.nodes.forEach((n) => (v.nodeLabels[n] = `set ${uf.find(n)}`));
    labels();
    rec.snap('INIT', 'Each vertex starts in its own set.', v.state(), { line: 1 });
    for (const e of g.edges) {
      const [ra, rb] = [uf.find(e.from), uf.find(e.to)];
      rec.snap(
        'FIND',
        `find(${e.from}) = ${ra}, find(${e.to}) = ${rb}.`,
        v.state({}, { edges: { [e.id]: 'compare' }, nodes: { [e.from]: 'active', [e.to]: 'active' } }),
        { line: 3 },
      );
      if (ra === rb) {
        v.edgeRoles[e.id] = 'error';
        rec.snap(
          'FOUND',
          `${e.from} and ${e.to} are already connected — edge ${e.from}-${e.to} closes a cycle.`,
          v.state(),
          { line: 3 },
        );
        return rec.finish(true, 'Cycle detected.', v.state());
      }
      uf.union(e.from, e.to);
      v.edgeRoles[e.id] = 'path';
      labels();
      rec.snap('UNION', `union(${e.from}, ${e.to}).`, v.state(), { line: 4 });
    }
    return rec.finish(false, 'No cycle — the graph is a forest.', v.state());
  },
};

export const components: AlgorithmDef = {
  id: 'graph-components',
  name: 'Connected components',
  category: 'graphs',
  visual: 'graph',
  summary: 'Start a BFS from every unvisited vertex; each BFS discovers one component.',
  pseudocode: [
    'count = 0',
    'for v in V:',
    '    if v not visited:',
    '        count++; BFS from v labelling component count',
    'return count',
  ],
  complexity: { time: VE, space: 'O(V)' },
  assumptions: ['Treats edges as undirected (weakly connected components for directed input).'],
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: { edges: 'A-B, B-C, D-E, F-G, G-H, H-F', directed: 'false', start: 'A' },
  run(input) {
    const g0 = readGraph(input);
    const g = { ...g0, directed: false };
    const adj = adjacency(g);
    const v = new GraphView(g0);
    const rec = new TraceRecorder<GraphState>('graph-components', { ...input });
    const comp: Record<string, number> = {};
    let count = 0;
    rec.snap('INIT', 'No components found yet.', v.state(), { line: 1 });
    for (const s of g.nodes) {
      if (comp[s] !== undefined) continue;
      count++;
      rec.snap(
        'UPDATE',
        `${s} is unvisited — start component #${count}.`,
        v.state({}, { nodes: { [s]: 'active' } }),
        { line: 4, vars: { count } },
      );
      const q = [s];
      comp[s] = count;
      while (q.length) {
        const u = q.shift()!;
        v.nodeRoles[u] = 'visited';
        v.nodeLabels[u] = `#${count}`;
        rec.snap('VISIT', `Label ${u} as component #${count}.`, v.state({}, { nodes: { [u]: 'active' } }), {
          line: 4,
          vars: { count },
        });
        for (const { to, edge } of adj.get(u)!) {
          if (comp[to] === undefined) {
            comp[to] = count;
            q.push(to);
            v.edgeRoles[edge] = 'path';
          }
        }
      }
    }
    return rec.finish(count, `${count} connected component(s).`, v.state());
  },
};

export const kruskal: AlgorithmDef = {
  id: 'graph-kruskal',
  name: "Kruskal's MST",
  category: 'graphs',
  visual: 'graph',
  summary: 'Sort edges by weight and add each one unless it would form a cycle (checked with Union-Find).',
  pseudocode: [
    'sort edges by weight',
    'for (u, v, w) in edges:',
    '    if find(u) != find(v):',
    '        union(u, v); add edge to MST',
    '    else: reject (would form a cycle)',
  ],
  complexity: { time: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)' }, space: 'O(V)' },
  assumptions: ['Undirected, weighted. A disconnected graph yields a minimum spanning forest.'],
  inputs: graphInputs('Start vertex (unused)'),
  defaultInput: preset('campus'),
  run(input) {
    const g = readGraph(input);
    if (g.directed) throw new InputError('Kruskal needs an undirected graph.');
    const v = new GraphView(g);
    const uf = new UnionFind(g.nodes);
    const rec = new TraceRecorder<GraphState>('graph-kruskal', { ...input });
    const sorted = [...g.edges].sort(
      (a, b) => a.w - b.w || a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    let total = 0;
    const chosen: string[] = [];
    rec.snap(
      'INIT',
      `Edges by weight: ${sorted.map((e) => `${e.from}${e.to}:${e.w}`).join(', ')}.`,
      v.state({ output: { label: 'MST edges', tokens: [] } }),
      { line: 1 },
    );
    for (const e of sorted) {
      rec.snap(
        'COMPARE',
        `Consider ${e.from}-${e.to} (w=${e.w}).`,
        v.state({ output: { label: 'MST edges', tokens: [...chosen] } }, { edges: { [e.id]: 'compare' } }),
        { line: 3, vars: { total } },
      );
      if (uf.union(e.from, e.to)) {
        total += e.w;
        chosen.push(`${e.from}${e.to}`);
        v.edgeRoles[e.id] = 'path';
        v.nodeRoles[e.from] = v.nodeRoles[e.to] = 'visited';
        rec.snap(
          'SELECT_EDGE',
          `Different sets — add it. MST weight = ${total}.`,
          v.state({ output: { label: 'MST edges', tokens: [...chosen] } }),
          { line: 4, vars: { total } },
        );
      } else {
        v.edgeRoles[e.id] = 'muted';
        rec.snap(
          'REJECT_EDGE',
          `${e.from} and ${e.to} already connected — reject.`,
          v.state({ output: { label: 'MST edges', tokens: [...chosen] } }, { edges: { [e.id]: 'error' } }),
          { line: 5, vars: { total } },
        );
      }
    }
    return rec.finish(
      total,
      `MST weight ${total} using ${chosen.length} edge(s).`,
      v.state({ output: { label: 'MST edges', tokens: chosen } }),
    );
  },
};

export const prim: AlgorithmDef = {
  id: 'graph-prim',
  name: "Prim's MST",
  category: 'graphs',
  visual: 'graph',
  summary: 'Grow a tree from the start vertex, always adding the cheapest edge that leaves the tree.',
  pseudocode: [
    'inTree = {start}; pq = edges leaving start',
    'while pq not empty:',
    '    (w, u, v) = pq.popMin()',
    '    if v in inTree: skip',
    '    add v and edge to tree; push edges leaving v',
  ],
  complexity: { time: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(E log V)' }, space: 'O(V + E)' },
  assumptions: ["Undirected, weighted. Only the start vertex's component is spanned."],
  inputs: graphInputs(),
  defaultInput: preset('campus'),
  run(input) {
    const g = readGraph(input);
    if (g.directed) throw new InputError("Prim's algorithm needs an undirected graph.");
    const start = readStart(input, g);
    const adj = adjacency(g);
    const v = new GraphView(g);
    const rec = new TraceRecorder<GraphState>('graph-prim', { ...input });
    const inTree = new Set([start]);
    const pq: { w: number; from: string; to: string; edge: string }[] = adj
      .get(start)!
      .map((x) => ({ w: x.w, from: start, to: x.to, edge: x.edge }));
    let total = 0;
    v.nodeRoles[start] = 'visited';
    const items = () => [...pq].sort((a, b) => a.w - b.w).map((x) => `${x.from}${x.to}:${x.w}`);
    rec.snap(
      'INIT',
      `Tree starts with ${start}.`,
      v.state({ frontier: { label: 'candidate edges', items: items() } }),
      { line: 1 },
    );
    while (pq.length) {
      pq.sort((a, b) => a.w - b.w || a.to.localeCompare(b.to));
      const e = pq.shift()!;
      if (inTree.has(e.to)) {
        rec.snap(
          'REJECT_EDGE',
          `${e.from}-${e.to} leads back into the tree — skip.`,
          v.state(
            { frontier: { label: 'candidate edges', items: items() } },
            { edges: { [e.edge]: 'error' } },
          ),
          { line: 4 },
        );
        continue;
      }
      inTree.add(e.to);
      total += e.w;
      v.edgeRoles[e.edge] = 'path';
      v.nodeRoles[e.to] = 'visited';
      for (const x of adj.get(e.to)!)
        if (!inTree.has(x.to)) pq.push({ w: x.w, from: e.to, to: x.to, edge: x.edge });
      rec.snap(
        'SELECT_EDGE',
        `Cheapest crossing edge ${e.from}-${e.to} (w=${e.w}); tree weight ${total}.`,
        v.state({ frontier: { label: 'candidate edges', items: items() } }, { nodes: { [e.to]: 'active' } }),
        { line: 5, vars: { total } },
      );
    }
    g.nodes.filter((n) => !inTree.has(n)).forEach((n) => (v.nodeRoles[n] = 'muted'));
    return rec.finish(total, `MST weight ${total}.`, v.state());
  },
};

export const unionFindDemo: AlgorithmDef = {
  id: 'union-find',
  name: 'Union-Find (disjoint sets)',
  category: 'graphs',
  visual: 'graph',
  summary: 'Union by rank with path compression. Each arrow points to a parent; roots point to themselves.',
  pseudocode: [
    'find(x): if parent[x] != x: parent[x] = find(parent[x]); return parent[x]',
    'union(a, b): ra = find(a); rb = find(b)',
    '    if ra == rb: already joined',
    '    attach lower-rank root under higher-rank root',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(α(n))', worst: 'O(α(n)) amortized' }, space: 'O(n)' },
  inputs: [{ key: 'script', label: 'Operations (union A B, find A)', type: 'text', maxLength: 200 }],
  defaultInput: { script: 'union A B, union C D, union B D, find C, union E F, find D, union A C' },
  run(input) {
    const parts = str(input, 'script', 200)
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 16) throw new InputError('At most 16 operations.');
    const ops = parts.map((p) => {
      const m = /^(union|find)\s+([A-Za-z0-9]{1,2})(?:\s+([A-Za-z0-9]{1,2}))?$/i.exec(p);
      if (!m || (m[1].toLowerCase() === 'union' && !m[3]) || (m[1].toLowerCase() === 'find' && m[3]))
        throw new InputError(`Cannot parse "${p}".`);
      return { op: m[1].toLowerCase(), a: m[2].toUpperCase(), b: m[3]?.toUpperCase() };
    });
    const items = [...new Set(ops.flatMap((o) => (o.b ? [o.a, o.b] : [o.a])))].sort();
    if (items.length > 12) throw new InputError('At most 12 elements.');
    const uf = new UnionFind(items);
    const rec = new TraceRecorder<GraphState>('union-find', { script: input.script });
    const nodes = layout(items);
    const st = (t: Record<string, Role> = {}): GraphState => ({
      kind: 'graph',
      directed: true,
      weighted: false,
      nodes,
      edges: items
        .filter((x) => uf.parent[x] !== x)
        .map((x) => ({ id: `p-${x}`, from: x, to: uf.parent[x] })),
      nodeRoles: {
        ...Object.fromEntries(items.filter((x) => uf.parent[x] === x).map((x) => [x, 'visited' as Role])),
        ...t,
      },
      edgeRoles: {},
      nodeLabels: Object.fromEntries(items.map((x) => [x, `rank ${uf.rank[x]}`])),
    });
    rec.snap('INIT', 'Every element is its own root.', st(), { line: 1 });
    for (const o of ops) {
      if (o.op === 'find') {
        const before = { ...uf.parent };
        const r = uf.find(o.a);
        const compressed = items.filter((x) => before[x] !== uf.parent[x]);
        rec.snap(
          'FIND',
          `find(${o.a}) = ${r}${compressed.length ? `; path compression re-points ${compressed.join(', ')}` : ''}.`,
          st({ [o.a]: 'active', [r]: 'found' }),
          { line: 1 },
        );
      } else {
        const [ra, rb] = [uf.find(o.a), uf.find(o.b!)];
        const joined = uf.union(o.a, o.b!);
        rec.snap(
          joined ? 'UNION' : 'COMPARE',
          joined
            ? `union(${o.a}, ${o.b}): roots ${ra} and ${rb} merged.`
            : `${o.a} and ${o.b} already share root ${ra}.`,
          st({ [o.a]: 'active', [o.b!]: 'active' }),
          { line: joined ? 4 : 3 },
        );
      }
    }
    const sets: Record<string, string[]> = {};
    items.forEach((x) => (sets[uf.find(x)] ??= []).push(x));
    return rec.finish(
      Object.values(sets).map((s) => s.join('')),
      `Sets: ${Object.values(sets)
        .map((s) => `{${s.join(', ')}}`)
        .join(' ')}.`,
      st(),
    );
  },
};

export const graphEditor: AlgorithmDef = {
  id: 'graph-edit',
  name: 'Graph operations & representations',
  category: 'graphs',
  visual: 'graph',
  summary:
    'Add/remove vertices and edges, change weights, search a vertex, and watch the adjacency matrix update.',
  pseudocode: [
    'addVertex(v): matrix grows by one row and column',
    'removeVertex(v): drop v and all incident edges',
    'addEdge(u, v, w): adj[u].add(v, w) (and adj[v].add(u, w) if undirected)',
    'removeEdge(u, v)',
    'setWeight(u, v, w)',
    'hasVertex(v): O(1) lookup',
  ],
  complexity: {
    time: { best: 'O(1)', average: 'O(1) list / O(1) matrix', worst: 'O(V + E) remove vertex' },
    space: 'O(V + E) list, O(V²) matrix',
  },
  inputs: [
    { key: 'edges', label: 'Initial edges', type: 'text', maxLength: 200 },
    {
      key: 'directed',
      label: 'Edges are',
      type: 'select',
      options: [
        { value: 'false', label: 'Undirected' },
        { value: 'true', label: 'Directed' },
      ],
    },
    { key: 'script', label: 'Operations', type: 'text', maxLength: 200 },
  ],
  defaultInput: {
    edges: 'A-B:2, B-C:3, A-C:7',
    directed: 'false',
    script: 'addv D, adde C D 4, setw A C 1, has D, remove B, rmedge A C, has B',
  },
  run(input) {
    const directed = String(input.directed) === 'true';
    const base = parseGraph(str(input, 'edges', 200), directed);
    const nodes = [...base.nodes];
    let edges = base.edges.map((e) => ({ ...e }));
    let seq = edges.length;
    const parts = str(input, 'script', 200)
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 15) throw new InputError('At most 15 operations.');
    const rec = new TraceRecorder<GraphState>('graph-edit', { ...input });
    const st = (t: { nodes?: Record<string, Role>; edges?: Record<string, Role> } = {}): GraphState => {
      const sorted = [...nodes].sort();
      const idx = Object.fromEntries(sorted.map((x, i) => [x, i]));
      const cells = sorted.map(() => sorted.map(() => null as number | null));
      edges.forEach((e) => {
        cells[idx[e.from]][idx[e.to]] = e.w;
        if (!directed) cells[idx[e.to]][idx[e.from]] = e.w;
      });
      return {
        kind: 'graph',
        directed,
        weighted: true,
        nodes: layout(sorted),
        edges: edges.map((e) => ({ id: e.id, from: e.from, to: e.to, weight: e.w })),
        nodeRoles: t.nodes ?? {},
        edgeRoles: t.edges ?? {},
        nodeLabels: Object.fromEntries(
          sorted.map((x) => [
            x,
            `deg ${edges.filter((e) => e.from === x || (!directed && e.to === x)).length}`,
          ]),
        ),
        matrix: { labels: sorted, cells, active: null },
      };
    };
    const match = (e: { from: string; to: string }, a: string, b: string) =>
      (e.from === a && e.to === b) || (!directed && e.from === b && e.to === a);
    rec.snap('INIT', 'Initial graph with its adjacency matrix.', st(), { line: 1 });
    for (const p of parts) {
      const [cmd, a0, b0, w0] = p.split(/\s+/);
      const a = (a0 ?? '').toUpperCase();
      const b = (b0 ?? '').toUpperCase();
      const valid = (x: string) => /^[A-Z0-9]{1,3}$/.test(x);
      switch (cmd?.toLowerCase()) {
        case 'addv':
          if (!valid(a)) throw new InputError(`Bad vertex in "${p}"`);
          if (nodes.includes(a)) rec.snap('ERROR', `Vertex ${a} already exists.`, st(), { line: 1 });
          else if (nodes.length >= 12) rec.snap('ERROR', 'Vertex limit (12) reached.', st(), { line: 1 });
          else {
            nodes.push(a);
            rec.snap('INSERT', `Add vertex ${a}.`, st({ nodes: { [a]: 'write' } }), { line: 1 });
          }
          break;
        case 'remove':
          if (!nodes.includes(a)) rec.snap('NOT_FOUND', `Vertex ${a} does not exist.`, st(), { line: 2 });
          else {
            const n = edges.filter((e) => e.from === a || e.to === a).length;
            nodes.splice(nodes.indexOf(a), 1);
            edges = edges.filter((e) => e.from !== a && e.to !== a);
            rec.snap('DELETE', `Remove vertex ${a} and its ${n} incident edge(s).`, st(), { line: 2 });
          }
          break;
        case 'adde': {
          const w = Number(w0 ?? 1);
          if (!valid(a) || !valid(b) || !Number.isInteger(w) || a === b)
            throw new InputError(`Bad edge in "${p}"`);
          if (!nodes.includes(a) || !nodes.includes(b))
            rec.snap('ERROR', `Both ${a} and ${b} must exist first.`, st(), { line: 3 });
          else if (edges.some((e) => match(e, a, b)))
            rec.snap('ERROR', `Edge ${a}-${b} already exists; use setw to change it.`, st(), { line: 3 });
          else {
            const id = `e${seq++}`;
            edges.push({ id, from: a, to: b, w });
            rec.snap(
              'INSERT',
              `Add edge ${a}${directed ? '→' : '–'}${b} with weight ${w}.`,
              st({ edges: { [id]: 'write' } }),
              { line: 3 },
            );
          }
          break;
        }
        case 'rmedge': {
          const e = edges.find((x) => match(x, a, b));
          if (!e) rec.snap('NOT_FOUND', `No edge ${a}-${b}.`, st(), { line: 4 });
          else {
            edges = edges.filter((x) => x !== e);
            rec.snap('DELETE', `Remove edge ${a}-${b}.`, st(), { line: 4 });
          }
          break;
        }
        case 'setw': {
          const e = edges.find((x) => match(x, a, b));
          const w = Number(w0);
          if (!Number.isInteger(w)) throw new InputError(`Bad weight in "${p}"`);
          if (!e) rec.snap('NOT_FOUND', `No edge ${a}-${b}.`, st(), { line: 5 });
          else {
            const old = e.w;
            e.w = w;
            rec.snap('UPDATE', `Weight of ${a}-${b}: ${old} → ${w}.`, st({ edges: { [e.id]: 'write' } }), {
              line: 5,
            });
          }
          break;
        }
        case 'has':
          rec.snap(
            nodes.includes(a) ? 'FOUND' : 'NOT_FOUND',
            `hasVertex(${a}) → ${nodes.includes(a)}.`,
            st(nodes.includes(a) ? { nodes: { [a]: 'found' } } : {}),
            { line: 6 },
          );
          break;
        default:
          throw new InputError(`Unknown operation "${p}". Use addv, remove, adde, rmedge, setw, has.`);
      }
    }
    const adjList = [...nodes].sort().map(
      (x) =>
        `${x}: ${edges
          .filter((e) => e.from === x || (!directed && e.to === x))
          .map((e) => (e.from === x ? e.to : e.from))
          .sort()
          .join(' ')}`,
    );
    return rec.finish(adjList, 'Final adjacency list: ' + adjList.join(' | '), st());
  },
};

export const GRAPH_ALGORITHMS: AlgorithmDef[] = [
  graphEditor,
  bfs,
  dfs,
  dijkstra,
  bellmanFord,
  floydWarshall,
  topoSort,
  directedCycle,
  undirectedCycle,
  components,
  kruskal,
  prim,
  unionFindDemo,
];
