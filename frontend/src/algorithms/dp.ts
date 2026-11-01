import { InputError, TraceRecorder } from '@/engine/recorder';
import type { CallFrame, GridState, RecursionState, Role } from '@/engine/types';
import type { AlgorithmDef } from './types';
import { num, nums, str } from './util';

export function grid(
  cells: (number | string | null)[][],
  highlights: GridState['highlights'] = [],
  extra: Partial<GridState> = {},
): GridState {
  return { kind: 'grid', cells: cells.map((r) => [...r]), highlights, ...extra };
}

export const climbingStairs: AlgorithmDef = {
  id: 'dp-climbing-stairs',
  name: 'Climbing stairs (tabulation)',
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'ways[i] = ways[i-1] + ways[i-2]: the last move was either one step or two.',
  pseudocode: [
    'ways[0] = 1; ways[1] = 1',
    'for i from 2 to n:',
    '    ways[i] = ways[i - 1] + ways[i - 2]',
    'return ways[n]',
  ],
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n) (O(1) with two variables)',
  },
  inputs: [{ key: 'n', label: 'Number of stairs', type: 'number', min: 1, max: 20 }],
  defaultInput: { n: 7 },
  run(input) {
    const n = num(input, 'n', { min: 1, max: 20 });
    const ways: (number | null)[] = new Array(n + 1).fill(null);
    const rec = new TraceRecorder<GridState>('dp-climbing-stairs', { n });
    const cols = Array.from({ length: n + 1 }, (_, i) => String(i));
    const g = (hl: GridState['highlights'] = []) =>
      grid([ways], hl, { colLabels: cols, rowLabels: ['ways'], caption: 'ways[i] = ways[i-1] + ways[i-2]' });
    ways[0] = 1;
    ways[1] = 1;
    rec.snap(
      'DP_UPDATE',
      'Base cases: one way to stand at step 0 and one way to reach step 1.',
      g([
        { r: 0, c: 0, role: 'found' },
        { r: 0, c: 1, role: 'found' },
      ]),
      { line: 1 },
    );
    for (let i = 2; i <= n; i++) {
      rec.snap(
        'READ',
        `Read ways[${i - 1}] = ${ways[i - 1]} and ways[${i - 2}] = ${ways[i - 2]}.`,
        g([
          { r: 0, c: i - 1, role: 'compare' },
          { r: 0, c: i - 2, role: 'compare' },
          { r: 0, c: i, role: 'active' },
        ]),
        { line: 3, vars: { i } },
      );
      ways[i] = ways[i - 1]! + ways[i - 2]!;
      rec.snap('DP_UPDATE', `ways[${i}] = ${ways[i]}.`, g([{ r: 0, c: i, role: 'write' }]), {
        line: 3,
        vars: { i, value: ways[i] },
      });
    }
    return rec.finish(
      ways[n]!,
      `There are ${ways[n]} ways to climb ${n} stairs.`,
      g([{ r: 0, c: n, role: 'found' }]),
      4,
    );
  },
};

export const coinChange: AlgorithmDef = {
  id: 'dp-coin-change',
  name: 'Coin change (minimum coins)',
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'best[a] = 1 + min over coins c of best[a − c].',
  pseudocode: [
    'best[0] = 0; best[1..amount] = ∞',
    'for a from 1 to amount:',
    '    for c in coins:',
    '        if c <= a: best[a] = min(best[a], best[a - c] + 1)',
    'return best[amount] (or -1 if ∞)',
  ],
  complexity: {
    time: { best: 'O(amount·k)', average: 'O(amount·k)', worst: 'O(amount·k)' },
    space: 'O(amount)',
  },
  inputs: [
    { key: 'coins', label: 'Coins', type: 'numbers', maxLength: 6 },
    { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 30 },
  ],
  defaultInput: { coins: [1, 3, 4], amount: 6 },
  run(input) {
    const coins = nums(input, 'coins', { min: 1, max: 6 });
    if (coins.some((c) => c <= 0)) throw new InputError('Coins must be positive.');
    const amount = num(input, 'amount', { min: 0, max: 30 });
    const best: (number | string)[] = new Array(amount + 1).fill('∞');
    best[0] = 0;
    const rec = new TraceRecorder<GridState>('dp-coin-change', { coins, amount });
    const cols = Array.from({ length: amount + 1 }, (_, i) => String(i));
    const g = (hl: GridState['highlights'] = []) =>
      grid([best], hl, { colLabels: cols, rowLabels: ['best'], caption: `coins = {${coins.join(', ')}}` });
    rec.snap('DP_UPDATE', 'best[0] = 0; everything else starts at ∞.', g([{ r: 0, c: 0, role: 'found' }]), {
      line: 1,
    });
    for (let a = 1; a <= amount; a++) {
      for (const c of coins) {
        if (c > a || best[a - c] === '∞') continue;
        const cand = (best[a - c] as number) + 1;
        rec.snap(
          'COMPARE',
          `Coin ${c}: best[${a - c}] + 1 = ${cand} vs best[${a}] = ${best[a]}.`,
          g([
            { r: 0, c: a - c, role: 'compare' },
            { r: 0, c: a, role: 'active' },
          ]),
          { line: 4, vars: { a, coin: c } },
        );
        if (best[a] === '∞' || cand < (best[a] as number)) {
          best[a] = cand;
          rec.snap('DP_UPDATE', `best[${a}] = ${cand}.`, g([{ r: 0, c: a, role: 'write' }]), {
            line: 4,
            vars: { a, coin: c },
          });
        }
      }
    }
    const res = best[amount] === '∞' ? -1 : (best[amount] as number);
    return rec.finish(
      res,
      res < 0 ? `Amount ${amount} cannot be formed.` : `Minimum coins for ${amount}: ${res}.`,
      g([{ r: 0, c: amount, role: res < 0 ? 'error' : 'found' }]),
      5,
    );
  },
};

export const lcs: AlgorithmDef = {
  id: 'dp-lcs',
  name: 'Longest common subsequence',
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'dp[i][j] = dp[i−1][j−1] + 1 if characters match, else max(dp[i−1][j], dp[i][j−1]).',
  pseudocode: [
    'dp[0][*] = dp[*][0] = 0',
    'for i in 1..m: for j in 1..n:',
    '    if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1] + 1',
    '    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
    'backtrack from dp[m][n] to recover the subsequence',
  ],
  complexity: { time: { best: 'O(m·n)', average: 'O(m·n)', worst: 'O(m·n)' }, space: 'O(m·n)' },
  inputs: [
    { key: 'a', label: 'String A', type: 'text', maxLength: 9 },
    { key: 'b', label: 'String B', type: 'text', maxLength: 9 },
  ],
  defaultInput: { a: 'ABCBDAB', b: 'BDCABA' },
  run(input) {
    const a = str(input, 'a', 9);
    const b = str(input, 'b', 9);
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    const rec = new TraceRecorder<GridState>('dp-lcs', { a, b });
    const g = (hl: GridState['highlights'] = []) =>
      grid(dp, hl, { rowLabels: ['∅', ...a], colLabels: ['∅', ...b], caption: 'LCS table' });
    rec.snap('INIT', 'First row and column are 0 (empty prefix).', g(), { line: 1 });
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          rec.snap(
            'DP_UPDATE',
            `'${a[i - 1]}' == '${b[j - 1]}': diagonal + 1 = ${dp[i][j]}.`,
            g([
              { r: i - 1, c: j - 1, role: 'compare' },
              { r: i, c: j, role: 'write' },
            ]),
            { line: 3, vars: { i, j } },
          );
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          rec.snap(
            'DP_UPDATE',
            `'${a[i - 1]}' ≠ '${b[j - 1]}': max(up ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}.`,
            g([
              { r: i - 1, c: j, role: 'compare' },
              { r: i, c: j - 1, role: 'compare' },
              { r: i, c: j, role: 'write' },
            ]),
            { line: 4, vars: { i, j } },
          );
        }
      }
    let i = m;
    let j = n;
    const path: GridState['highlights'] = [];
    let out = '';
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        out = a[i - 1] + out;
        path.push({ r: i, c: j, role: 'found' });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        path.push({ r: i, c: j, role: 'path' });
        i--;
      } else {
        path.push({ r: i, c: j, role: 'path' });
        j--;
      }
    }
    rec.snap('FOUND', `Backtrack: matched characters spell "${out}".`, g(path), { line: 5 });
    return rec.finish(out, `LCS length ${dp[m][n]}: "${out}".`, g(path), 5);
  },
};

export const knapsack: AlgorithmDef = {
  id: 'dp-knapsack',
  name: '0/1 knapsack',
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'dp[i][w] = max(skip item i, take item i if it fits).',
  pseudocode: [
    'dp[0][*] = 0',
    'for i in 1..n: for w in 0..W:',
    '    dp[i][w] = dp[i-1][w]   // skip',
    '    if wt[i] <= w: dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i]] + val[i])',
    'return dp[n][W]',
  ],
  complexity: { time: { best: 'O(n·W)', average: 'O(n·W)', worst: 'O(n·W)' }, space: 'O(n·W)' },
  inputs: [
    { key: 'weights', label: 'Weights', type: 'numbers', maxLength: 5 },
    { key: 'values', label: 'Values', type: 'numbers', maxLength: 5 },
    { key: 'capacity', label: 'Capacity', type: 'number', min: 1, max: 10 },
  ],
  defaultInput: { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 },
  run(input) {
    const wt = nums(input, 'weights', { min: 1, max: 5 });
    const val = nums(input, 'values', { min: 1, max: 5 });
    const W = num(input, 'capacity', { min: 1, max: 10 });
    if (wt.length !== val.length) throw new InputError('Weights and values must have the same length.');
    if (wt.some((w) => w <= 0)) throw new InputError('Weights must be positive.');
    const n = wt.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
    const rec = new TraceRecorder<GridState>('dp-knapsack', { weights: wt, values: val, capacity: W });
    const g = (hl: GridState['highlights'] = []) =>
      grid(dp, hl, {
        rowLabels: ['none', ...wt.map((w, i) => `w${w}/v${val[i]}`)],
        colLabels: Array.from({ length: W + 1 }, (_, i) => String(i)),
        caption: 'rows: items considered, columns: capacity',
      });
    rec.snap('INIT', 'With no items the best value is 0.', g(), { line: 1 });
    for (let i = 1; i <= n; i++)
      for (let w = 0; w <= W; w++) {
        dp[i][w] = dp[i - 1][w];
        if (wt[i - 1] <= w && dp[i - 1][w - wt[i - 1]] + val[i - 1] > dp[i][w]) {
          dp[i][w] = dp[i - 1][w - wt[i - 1]] + val[i - 1];
          rec.snap(
            'DP_UPDATE',
            `Take item ${i}: ${dp[i - 1][w - wt[i - 1]]} + ${val[i - 1]} = ${dp[i][w]} beats skipping (${dp[i - 1][w]}).`,
            g([
              { r: i - 1, c: w, role: 'compare' },
              { r: i - 1, c: w - wt[i - 1], role: 'compare' },
              { r: i, c: w, role: 'write' },
            ]),
            { line: 4, vars: { i, w } },
          );
        } else {
          rec.snap(
            'DP_UPDATE',
            wt[i - 1] > w
              ? `Item ${i} (weight ${wt[i - 1]}) does not fit in ${w}: copy ${dp[i][w]}.`
              : `Skipping item ${i} is at least as good: ${dp[i][w]}.`,
            g([
              { r: i - 1, c: w, role: 'compare' },
              { r: i, c: w, role: 'write' },
            ]),
            { line: 3, vars: { i, w } },
          );
        }
      }
    return rec.finish(
      dp[n][W],
      `Best value with capacity ${W}: ${dp[n][W]}.`,
      g([{ r: n, c: W, role: 'found' }]),
      5,
    );
  },
};

export const maxSubarray: AlgorithmDef = {
  id: 'dp-kadane',
  name: "Maximum subarray (Kadane's)",
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'best ending here = max(x, best ending at previous + x); track the global maximum.',
  pseudocode: [
    'cur = best = a[0]',
    'for i from 1 to n - 1:',
    '    cur = max(a[i], cur + a[i])',
    '    best = max(best, cur)',
    'return best',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
  inputs: [{ key: 'values', label: 'Array', type: 'numbers', maxLength: 14 }],
  defaultInput: { values: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
  run(input) {
    const a = nums(input, 'values', { min: 1, max: 14 });
    const curRow: (number | null)[] = a.map(() => null);
    const bestRow: (number | null)[] = a.map(() => null);
    const rec = new TraceRecorder<GridState>('dp-kadane', { values: a });
    const g = (hl: GridState['highlights'] = []) =>
      grid([a, curRow, bestRow], hl, {
        rowLabels: ['a[i]', 'ending here', 'best so far'],
        colLabels: a.map((_, i) => String(i)),
      });
    curRow[0] = bestRow[0] = a[0];
    let start = 0;
    let bs = 0;
    let be = 0;
    rec.snap(
      'DP_UPDATE',
      `Start with a[0] = ${a[0]}.`,
      g([
        { r: 1, c: 0, role: 'write' },
        { r: 2, c: 0, role: 'write' },
      ]),
      { line: 1 },
    );
    for (let i = 1; i < a.length; i++) {
      const extend = curRow[i - 1]! + a[i];
      if (a[i] > extend) start = i;
      curRow[i] = Math.max(a[i], extend);
      rec.snap(
        'DP_UPDATE',
        a[i] > extend
          ? `Restart at ${a[i]} (better than extending to ${extend}).`
          : `Extend: ${curRow[i - 1]} + ${a[i]} = ${extend}.`,
        g([
          { r: 1, c: i - 1, role: 'compare' },
          { r: 0, c: i, role: 'compare' },
          { r: 1, c: i, role: 'write' },
        ]),
        { line: 3, vars: { i, cur: curRow[i] } },
      );
      bestRow[i] = Math.max(bestRow[i - 1]!, curRow[i]!);
      if (curRow[i]! > bestRow[i - 1]!) {
        bs = start;
        be = i;
      }
      rec.snap('DP_UPDATE', `best = ${bestRow[i]}.`, g([{ r: 2, c: i, role: 'write' }]), {
        line: 4,
        vars: { i, best: bestRow[i] },
      });
    }
    const hl = Array.from({ length: be - bs + 1 }, (_, k) => ({ r: 0, c: bs + k, role: 'found' as Role }));
    return rec.finish(
      bestRow[a.length - 1]!,
      `Maximum subarray sum ${bestRow[a.length - 1]} (indices ${bs}..${be}).`,
      g(hl),
      5,
    );
  },
};

export const editDistance: AlgorithmDef = {
  id: 'dp-edit-distance',
  name: 'Edit distance',
  category: 'dynamic-programming',
  visual: 'grid',
  summary: 'Minimum insertions, deletions and substitutions to turn A into B.',
  pseudocode: [
    'dp[i][0] = i; dp[0][j] = j',
    'for i in 1..m: for j in 1..n:',
    '    if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]',
    '    else: dp[i][j] = 1 + min(delete dp[i-1][j], insert dp[i][j-1], replace dp[i-1][j-1])',
    'return dp[m][n]',
  ],
  complexity: { time: { best: 'O(m·n)', average: 'O(m·n)', worst: 'O(m·n)' }, space: 'O(m·n)' },
  inputs: [
    { key: 'a', label: 'From', type: 'text', maxLength: 8 },
    { key: 'b', label: 'To', type: 'text', maxLength: 8 },
  ],
  defaultInput: { a: 'horse', b: 'ros' },
  run(input) {
    const a = str(input, 'a', 8);
    const b = str(input, 'b', 8);
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    const rec = new TraceRecorder<GridState>('dp-edit-distance', { a, b });
    const g = (hl: GridState['highlights'] = []) =>
      grid(dp, hl, { rowLabels: ['∅', ...a], colLabels: ['∅', ...b] });
    rec.snap('INIT', 'Converting to/from the empty string costs its length.', g(), { line: 1 });
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
          rec.snap(
            'DP_UPDATE',
            `'${a[i - 1]}' matches — copy diagonal ${dp[i][j]}.`,
            g([
              { r: i - 1, c: j - 1, role: 'compare' },
              { r: i, c: j, role: 'write' },
            ]),
            { line: 3, vars: { i, j } },
          );
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
          rec.snap(
            'DP_UPDATE',
            `1 + min(${dp[i - 1][j]}, ${dp[i][j - 1]}, ${dp[i - 1][j - 1]}) = ${dp[i][j]}.`,
            g([
              { r: i - 1, c: j, role: 'compare' },
              { r: i, c: j - 1, role: 'compare' },
              { r: i - 1, c: j - 1, role: 'compare' },
              { r: i, c: j, role: 'write' },
            ]),
            { line: 4, vars: { i, j } },
          );
        }
      }
    return rec.finish(dp[m][n], `Edit distance = ${dp[m][n]}.`, g([{ r: m, c: n, role: 'found' }]), 5);
  },
};

// ------------------------------------------------ Fibonacci with memoization (recursion tree)

export const fibMemo: AlgorithmDef = {
  id: 'dp-fib-memo',
  name: 'Fibonacci (memoization vs naive)',
  category: 'dynamic-programming',
  visual: 'recursion',
  summary: 'Top-down recursion that caches results; repeated subproblems become O(1) lookups.',
  pseudocode: [
    'fib(n):',
    '    if n <= 1: return n',
    '    if memo has n: return memo[n]',
    '    memo[n] = fib(n - 1) + fib(n - 2)',
    '    return memo[n]',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n) memo / O(2ⁿ) naive' }, space: 'O(n)' },
  inputs: [
    { key: 'n', label: 'n', type: 'number', min: 0, max: 9 },
    {
      key: 'memo',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'true', label: 'With memoization' },
        { value: 'false', label: 'Naive recursion' },
      ],
    },
  ],
  defaultInput: { n: 6, memo: 'true' },
  run(input) {
    const n = num(input, 'n', { min: 0, max: 9 });
    const useMemo = String(input.memo) !== 'false';
    const memo = new Map<number, number>();
    const frames: CallFrame[] = [];
    const stack: string[] = [];
    let seq = 0;
    let calls = 0;
    const rec = new TraceRecorder<RecursionState>('dp-fib-memo', { n, memo: useMemo });
    const memoRow = () => ({
      label: 'memo',
      tokens: Array.from({ length: n + 1 }, (_, i) => (memo.has(i) ? `${i}:${memo.get(i)}` : `${i}:·`)),
    });
    const st = (): RecursionState => ({
      kind: 'recursion',
      frames: frames.map((f) => ({ ...f })),
      stack: [...stack],
      output: useMemo ? memoRow() : undefined,
    });
    rec.snap('INIT', `Compute fib(${n}) ${useMemo ? 'with' : 'without'} a memo table.`, st(), { line: 1 });
    const go = (k: number, parent: string | null, depth: number): number => {
      calls++;
      const id = `f${seq++}`;
      const frame: CallFrame = { id, label: `fib(${k})`, depth, status: 'active', parent };
      frames.push(frame);
      if (parent) frames.find((f) => f.id === parent)!.status = 'waiting';
      stack.push(frame.label);
      rec.snap('CALL', `Call fib(${k}).`, st(), { line: 1, vars: { k, depth, calls } });
      let r: number;
      if (k <= 1) {
        r = k;
        frame.status = 'base';
        rec.snap('RETURN', `Base case fib(${k}) = ${k}.`, st(), { line: 2, vars: { k } });
      } else if (useMemo && memo.has(k)) {
        r = memo.get(k)!;
        frame.status = 'base';
        rec.snap('FOUND', `Memo hit: fib(${k}) = ${r} — no recursion needed.`, st(), {
          line: 3,
          vars: { k },
        });
      } else {
        r = go(k - 1, id, depth + 1) + go(k - 2, id, depth + 1);
        frame.status = 'active';
        if (useMemo) memo.set(k, r);
        rec.snap('DP_UPDATE', `fib(${k}) = ${r}${useMemo ? ' — store in memo' : ''}.`, st(), {
          line: 4,
          vars: { k, value: r },
        });
      }
      frame.status = 'returned';
      frame.returnValue = String(r);
      stack.pop();
      if (parent) frames.find((f) => f.id === parent)!.status = 'active';
      rec.snap('RETURN', `Return ${r} from fib(${k}).`, st(), { line: 5, vars: { k, value: r } });
      return r;
    };
    const res = go(n, null, 0);
    return rec.finish(res, `fib(${n}) = ${res} using ${calls} call(s).`, st(), 5);
  },
};

export const DP_ALGORITHMS: AlgorithmDef[] = [
  fibMemo,
  climbingStairs,
  coinChange,
  maxSubarray,
  lcs,
  editDistance,
  knapsack,
];
