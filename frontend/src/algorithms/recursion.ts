import { InputError, TraceRecorder } from '@/engine/recorder';
import type { CallFrame, GridState, RecursionState } from '@/engine/types';
import { grid } from './dp';
import type { AlgorithmDef } from './types';
import { num, nums, str } from './util';

class CallTracker {
  frames: CallFrame[] = [];
  stack: string[] = [];
  private seq = 0;
  output: string[] = [];
  push(label: string, parent: string | null, depth: number): CallFrame {
    const f: CallFrame = { id: `c${this.seq++}`, label, depth, status: 'active', parent };
    this.frames.push(f);
    if (parent) this.byId(parent).status = 'waiting';
    this.stack.push(label);
    return f;
  }
  pop(f: CallFrame, ret?: string, status: CallFrame['status'] = 'returned') {
    f.status = status;
    f.returnValue = ret;
    this.stack.pop();
    if (f.parent) this.byId(f.parent).status = 'active';
  }
  byId(id: string) {
    return this.frames.find((x) => x.id === id)!;
  }
  state(outLabel = 'results', g?: GridState): RecursionState {
    return {
      kind: 'recursion',
      frames: this.frames.map((f) => ({ ...f })),
      stack: [...this.stack],
      output: { label: outLabel, tokens: [...this.output] },
      grid: g,
    };
  }
}

export const factorial: AlgorithmDef = {
  id: 'rec-factorial',
  name: 'Factorial (call stack)',
  category: 'recursion',
  visual: 'recursion',
  summary: 'Each call waits for a smaller subproblem; values flow back as the stack unwinds.',
  pseudocode: ['fact(n):', '    if n <= 1: return 1   // base case', '    return n * fact(n - 1)'],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n) stack' },
  inputs: [{ key: 'n', label: 'n', type: 'number', min: 0, max: 10 }],
  defaultInput: { n: 5 },
  run(input) {
    const n = num(input, 'n', { min: 0, max: 10 });
    const t = new CallTracker();
    const rec = new TraceRecorder<RecursionState>('rec-factorial', { n });
    rec.snap('INIT', `Compute ${n}!.`, t.state(), { line: 1 });
    const go = (k: number, parent: string | null, depth: number): number => {
      const f = t.push(`fact(${k})`, parent, depth);
      rec.snap('CALL', `Call fact(${k}) at depth ${depth}.`, t.state(), { line: 1, vars: { n: k, depth } });
      if (k <= 1) {
        t.pop(f, '1', 'base');
        rec.snap('RETURN', `Base case: fact(${k}) = 1.`, t.state(), { line: 2, vars: { n: k } });
        return 1;
      }
      const sub = go(k - 1, f.id, depth + 1);
      const r = k * sub;
      t.pop(f, String(r));
      rec.snap('RETURN', `fact(${k}) = ${k} × ${sub} = ${r}.`, t.state(), {
        line: 3,
        vars: { n: k, result: r },
      });
      return r;
    };
    const r = go(n, null, 0);
    return rec.finish(r, `${n}! = ${r}.`, t.state(), 3);
  },
};

export const subsets: AlgorithmDef = {
  id: 'rec-subsets',
  name: 'Subsets (backtracking)',
  category: 'recursion',
  visual: 'recursion',
  summary: 'For each element choose include or exclude; every leaf is one subset.',
  pseudocode: [
    'backtrack(i, current):',
    '    if i == n: record current; return',
    '    current.add(a[i]); backtrack(i + 1)   // include',
    '    current.removeLast()                   // undo',
    '    backtrack(i + 1)                       // exclude',
  ],
  complexity: { time: { best: 'O(n·2ⁿ)', average: 'O(n·2ⁿ)', worst: 'O(n·2ⁿ)' }, space: 'O(n) stack' },
  inputs: [{ key: 'values', label: 'Set', type: 'numbers', maxLength: 4 }],
  defaultInput: { values: [1, 2, 3] },
  run(input) {
    const a = nums(input, 'values', { max: 4 });
    const t = new CallTracker();
    const rec = new TraceRecorder<RecursionState>('rec-subsets', { values: a });
    const cur: number[] = [];
    rec.snap('INIT', 'Explore include/exclude choices.', t.state('subsets'), { line: 1 });
    const go = (i: number, parent: string | null) => {
      const f = t.push(`[${cur.join(',')}] i=${i}`, parent, i);
      rec.snap('CALL', `At index ${i} with [${cur.join(', ')}].`, t.state('subsets'), {
        line: 1,
        vars: { i, current: [...cur] },
      });
      if (i === a.length) {
        t.output.push(`{${cur.join(',')}}`);
        t.pop(f, `{${cur.join(',')}}`, 'base');
        rec.snap('FOUND', `Record subset {${cur.join(', ')}}.`, t.state('subsets'), { line: 2 });
        return;
      }
      cur.push(a[i]);
      rec.snap('PUSH', `Include ${a[i]}.`, t.state('subsets'), { line: 3, vars: { current: [...cur] } });
      go(i + 1, f.id);
      cur.pop();
      rec.snap('POP', `Undo: remove ${a[i]}.`, t.state('subsets'), { line: 4, vars: { current: [...cur] } });
      go(i + 1, f.id);
      t.pop(f);
      rec.snap('RETURN', `Return from index ${i}.`, t.state('subsets'), { line: 5 });
    };
    go(0, null);
    return rec.finish(t.output, `${t.output.length} subsets.`, t.state('subsets'));
  },
};

export const combinationSum: AlgorithmDef = {
  id: 'rec-combination-sum',
  name: 'Combination sum (backtracking)',
  category: 'recursion',
  visual: 'recursion',
  summary:
    'Pick candidates (reusable) in non-decreasing order; prune when the remaining target goes negative.',
  pseudocode: [
    'bt(start, remaining):',
    '    if remaining == 0: record; return',
    '    for i from start: c = cand[i]',
    '        if c > remaining: break   // prune (sorted)',
    '        path.add(c); bt(i, remaining - c); path.removeLast()',
  ],
  complexity: {
    time: { best: 'O(2^t) bound', average: 'exponential', worst: 'exponential' },
    space: 'O(target) stack',
  },
  inputs: [
    { key: 'candidates', label: 'Candidates', type: 'numbers', maxLength: 5 },
    { key: 'target', label: 'Target', type: 'number', min: 1, max: 12 },
  ],
  defaultInput: { candidates: [2, 3, 6, 7], target: 7 },
  run(input) {
    const cand = [...new Set(nums(input, 'candidates', { min: 1, max: 5 }))].sort((x, y) => x - y);
    if (cand.some((c) => c <= 0)) throw new InputError('Candidates must be positive.');
    const target = num(input, 'target', { min: 1, max: 12 });
    const t = new CallTracker();
    const rec = new TraceRecorder<RecursionState>('rec-combination-sum', { candidates: cand, target });
    const path: number[] = [];
    rec.snap('INIT', `Find combinations summing to ${target}.`, t.state('combinations'), { line: 1 });
    const go = (start: number, rem: number, parent: string | null, depth: number) => {
      const f = t.push(`rem=${rem} [${path.join(',')}]`, parent, depth);
      rec.snap('CALL', `remaining ${rem}, path [${path.join(', ')}].`, t.state('combinations'), {
        line: 1,
        vars: { remaining: rem },
      });
      if (rem === 0) {
        t.output.push(`[${path.join(',')}]`);
        t.pop(f, 'found', 'base');
        rec.snap('FOUND', `Found [${path.join(', ')}].`, t.state('combinations'), { line: 2 });
        return;
      }
      for (let i = start; i < cand.length; i++) {
        if (cand[i] > rem) {
          rec.snap(
            'COMPARE',
            `${cand[i]} > ${rem}: prune the rest (candidates are sorted).`,
            t.state('combinations'),
            { line: 4 },
          );
          break;
        }
        path.push(cand[i]);
        go(i, rem - cand[i], f.id, depth + 1);
        path.pop();
      }
      t.pop(f);
      rec.snap('RETURN', `Backtrack from remaining ${rem}.`, t.state('combinations'), { line: 5 });
    };
    go(0, target, null, 0);
    return rec.finish(t.output, `${t.output.length} combination(s).`, t.state('combinations'));
  },
};

export const nQueens: AlgorithmDef = {
  id: 'rec-n-queens',
  name: 'N-Queens (backtracking)',
  category: 'recursion',
  visual: 'grid',
  summary: 'Place one queen per row; backtrack whenever a column or diagonal is attacked.',
  pseudocode: [
    'place(row):',
    '    if row == n: solution found',
    '    for col in 0..n-1:',
    '        if safe(row, col): put queen; place(row + 1); remove queen',
    '    return (backtrack)',
  ],
  complexity: { time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' }, space: 'O(n)' },
  inputs: [{ key: 'n', label: 'Board size', type: 'number', min: 4, max: 6 }],
  defaultInput: { n: 4 },
  run(input) {
    const n = num(input, 'n', { min: 4, max: 6 });
    const board: (string | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
    const rec = new TraceRecorder<GridState>('rec-n-queens', { n });
    const g = (hl: GridState['highlights'] = []) => grid(board, hl, { caption: `${n}×${n} board` });
    const cols = new Set<number>();
    const d1 = new Set<number>();
    const d2 = new Set<number>();
    rec.snap('INIT', 'Empty board.', g(), { line: 1 });
    const place = (r: number): boolean => {
      if (r === n) return true;
      for (let c = 0; c < n; c++) {
        const safe = !cols.has(c) && !d1.has(r - c) && !d2.has(r + c);
        rec.snap(
          'COMPARE',
          `Row ${r}, column ${c}: ${safe ? 'safe' : 'attacked'}.`,
          g([{ r, c, role: safe ? 'active' : 'error' }]),
          { line: 4, vars: { row: r, col: c } },
        );
        if (!safe) continue;
        board[r][c] = '♛';
        cols.add(c);
        d1.add(r - c);
        d2.add(r + c);
        rec.snap('INSERT', `Place a queen at (${r}, ${c}).`, g([{ r, c, role: 'write' }]), {
          line: 4,
          vars: { row: r, col: c },
        });
        if (place(r + 1)) return true;
        board[r][c] = null;
        cols.delete(c);
        d1.delete(r - c);
        d2.delete(r + c);
        rec.snap(
          'DELETE',
          `Dead end — remove the queen from (${r}, ${c}) and backtrack.`,
          g([{ r, c, role: 'muted' }]),
          { line: 4, vars: { row: r, col: c } },
        );
      }
      return false;
    };
    const ok = place(0);
    const queens = board.flatMap((row, r) =>
      row.flatMap((x, c) => (x ? [{ r, c, role: 'found' as const }] : [])),
    );
    return rec.finish(
      ok ? board.map((row) => row.findIndex((x) => x !== null)) : null,
      ok ? 'First solution found.' : 'No solution.',
      g(queens),
      2,
    );
  },
};

export const wordSearch: AlgorithmDef = {
  id: 'rec-word-search',
  name: 'Word search (grid DFS)',
  category: 'recursion',
  visual: 'grid',
  summary:
    'From each starting cell, DFS to neighbours matching the next letter; mark cells to avoid reuse and unmark on backtrack.',
  pseudocode: [
    'for each cell: if dfs(cell, 0): return true',
    'dfs(r, c, k):',
    '    if k == len(word): return true',
    '    if out of bounds or used or grid[r][c] != word[k]: return false',
    '    mark used; try 4 neighbours with k + 1; unmark',
  ],
  complexity: { time: { best: 'O(R·C)', average: 'O(R·C·3^L)', worst: 'O(R·C·3^L)' }, space: 'O(L)' },
  inputs: [
    { key: 'board', label: 'Board rows (comma separated)', type: 'text', maxLength: 40 },
    { key: 'word', label: 'Word', type: 'text', maxLength: 8 },
  ],
  defaultInput: { board: 'ABCE, SFCS, ADEE', word: 'ABCCED' },
  run(input) {
    const rows = str(input, 'board', 40)
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    const word = str(input, 'word', 8).toUpperCase();
    if (!rows.length || rows.some((r) => r.length !== rows[0].length || !/^[A-Z]+$/.test(r)))
      throw new InputError('Rows must be equal-length letters.');
    if (rows.length > 5 || rows[0].length > 6) throw new InputError('Board up to 5×6.');
    const cells = rows.map((r) => [...r] as (string | null)[]);
    const used = rows.map((r) => new Array(r.length).fill(false));
    const rec = new TraceRecorder<GridState>('rec-word-search', { board: input.board, word });
    const hl = (extra: GridState['highlights'] = []) => [
      ...used.flatMap((row, r) => row.flatMap((u, c) => (u ? [{ r, c, role: 'path' as const }] : []))),
      ...extra,
    ];
    const g = (extra: GridState['highlights'] = []) => grid(cells, hl(extra), { caption: `word: ${word}` });
    rec.snap('INIT', `Search for "${word}".`, g(), { line: 1 });
    const dfs = (r: number, c: number, k: number): boolean => {
      if (k === word.length) return true;
      if (r < 0 || c < 0 || r >= rows.length || c >= rows[0].length || used[r][c]) return false;
      const match = rows[r][c] === word[k];
      rec.snap(
        'COMPARE',
        `(${r}, ${c}) = '${rows[r][c]}' vs word[${k}] = '${word[k]}' → ${match ? 'match' : 'no'}.`,
        g([{ r, c, role: match ? 'active' : 'error' }]),
        { line: 4, vars: { r, c, k } },
      );
      if (!match) return false;
      used[r][c] = true;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ])
        if (dfs(r + dr, c + dc, k + 1)) return true;
      used[r][c] = false;
      rec.snap('POP', `Backtrack from (${r}, ${c}).`, g([{ r, c, role: 'muted' }]), {
        line: 5,
        vars: { r, c, k },
      });
      return false;
    };
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[0].length; c++)
        if (dfs(r, c, 0)) {
          rec.snap('FOUND', `"${word}" found.`, g(), { line: 3 });
          return rec.finish(true, 'Found.', g());
        }
    return rec.finish(false, `"${word}" is not in the grid.`, g(), 1);
  },
};

export const RECURSION_ALGORITHMS: AlgorithmDef[] = [factorial, subsets, combinationSum, nQueens, wordSearch];
