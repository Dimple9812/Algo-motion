import { describe, expect, it } from 'vitest';
import {
  bellmanFord,
  bfs,
  components,
  dfs,
  dijkstra,
  directedCycle,
  floydWarshall,
  graphEditor,
  kruskal,
  parseGraph,
  prim,
  topoSort,
  undirectedCycle,
  unionFindDemo,
} from './graph';

const campus = { edges: 'A-B:4, A-C:2, B-C:5, B-D:10, C-E:3, E-D:4, D-F:11', directed: 'false', start: 'A' };

describe('graphs', () => {
  it('parses edges', () => {
    const g = parseGraph('A-B:4, B-C', false);
    expect(g.nodes).toEqual(['A', 'B', 'C']);
    expect(g.weighted).toBe(true);
    expect(() => parseGraph('A-A', false)).toThrow(/Self-loop/);
    expect(() => parseGraph('A--', false)).toThrow();
  });
  it('BFS and DFS orders, including unreachable vertices', () => {
    const g = { edges: 'A-B, A-C, B-D, C-D, D-E, G-H', directed: 'false', start: 'A' };
    expect(bfs.run(g).result).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(dfs.run(g).result).toEqual(['A', 'B', 'D', 'C', 'E']);
    expect(bfs.run(g).steps.at(-1)!.explanation).toMatch(/Unreachable: G, H/);
    expect(() => bfs.run({ ...g, start: 'Z' })).toThrow(/not in the graph/);
  });
  it('Dijkstra matches Bellman-Ford on non-negative graphs and rejects negative weights', () => {
    const d = dijkstra.run(campus).result;
    expect(d).toEqual({ A: 0, B: 4, C: 2, D: 9, E: 5, F: 20 });
    expect(bellmanFord.run(campus).result).toEqual(d);
    expect(() => dijkstra.run({ edges: 'A>B:-1', directed: 'true', start: 'A' })).toThrow(/non-negative/);
  });
  it('Dijkstra reports unreachable vertices as null', () => {
    expect(dijkstra.run({ edges: 'A>B:1, C>D:1', directed: 'true', start: 'A' }).result).toEqual({
      A: 0,
      B: 1,
      C: null,
      D: null,
    });
  });
  it('Bellman-Ford handles negative weights and detects negative cycles', () => {
    expect(
      bellmanFord.run({ edges: 'S>A:4, S>B:5, A>C:-3, B>A:-2, C>D:2, B>D:6', directed: 'true', start: 'S' })
        .result,
    ).toEqual({ A: 3, B: 5, C: 0, D: 2, S: 0 });
    expect(bellmanFord.run({ edges: 'A>B:1, B>C:-2, C>A:-1', directed: 'true', start: 'A' }).result).toBe(
      'negative-cycle',
    );
  });
  it('Floyd-Warshall', () => {
    const r = floydWarshall.run({ edges: 'A>B:3, B>C:2, C>A:1', directed: 'true', start: 'A' })
      .result as string[];
    expect(r).toEqual(['0 3 5', '3 0 2', '1 4 0']);
  });
  it('topological sort and cycle detection', () => {
    expect(
      topoSort.run({ edges: 'A>C, B>C, B>D, C>E, D>F, E>F, F>G', directed: 'true', start: 'A' }).result,
    ).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(topoSort.run({ edges: 'A>B, B>A', directed: 'true', start: 'A' }).result).toBe('cycle');
    expect(directedCycle.run({ edges: 'A>B, B>C, C>A', directed: 'true', start: 'A' }).result).toBe(true);
    expect(directedCycle.run({ edges: 'A>B, A>C, B>C', directed: 'true', start: 'A' }).result).toBe(false);
    expect(undirectedCycle.run({ edges: 'A-B, B-C, C-A', directed: 'false', start: 'A' }).result).toBe(true);
    expect(undirectedCycle.run({ edges: 'A-B, B-C, C-D', directed: 'false', start: 'A' }).result).toBe(false);
  });
  it('components and MSTs', () => {
    expect(components.run({ edges: 'A-B, B-C, D-E, F-G', directed: 'false', start: 'A' }).result).toBe(3);
    expect(kruskal.run(campus).result).toBe(24);
    expect(prim.run(campus).result).toBe(24);
    expect(() => kruskal.run({ ...campus, directed: 'true' })).toThrow();
  });
  it('union-find and graph editor', () => {
    expect(unionFindDemo.run({ script: 'union A B, union C D, find C' }).result).toEqual(['AB', 'CD']);
    const ed = graphEditor.run({
      edges: 'A-B:2, B-C:3',
      directed: 'false',
      script: 'addv D, adde C D 4, remove B',
    }).result;
    expect(ed).toEqual(['A: ', 'C: D', 'D: C']);
    expect(() => graphEditor.run({ edges: 'A-B', directed: 'false', script: 'drop everything' })).toThrow();
  });
});
