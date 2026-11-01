import { InputError, TraceRecorder } from '@/engine/recorder';
import type { StackState } from '@/engine/types';
import type { AlgorithmDef } from './types';
import { num, nums, randomInts, str } from './util';

export interface ScriptOp {
  op: string;
  arg: number | null;
}

/** Parses "push 3, pop, peek" style scripts. Only whitelisted verbs are accepted. */
export function parseScript(text: string, verbs: Record<string, boolean>, maxOps = 20): ScriptOp[] {
  const parts = text
    .split(/[,;\n]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length > maxOps) throw new InputError(`At most ${maxOps} operations.`);
  return parts.map((p) => {
    const m = /^([a-z]+)(?:\s+(-?\d{1,4}))?$/.exec(p);
    if (!m || !(m[1] in verbs))
      throw new InputError(`Unknown operation "${p}". Allowed: ${Object.keys(verbs).join(', ')}`);
    const needsArg = verbs[m[1]];
    if (needsArg && m[2] === undefined) throw new InputError(`"${m[1]}" needs a number`);
    if (!needsArg && m[2] !== undefined) throw new InputError(`"${m[1]}" takes no number`);
    return { op: m[1], arg: m[2] === undefined ? null : Number(m[2]) };
  });
}

const st = (
  items: (number | string)[],
  capacity: number | null,
  top?: 'active' | 'found' | 'error' | 'write',
  extra: Partial<StackState> = {},
): StackState => ({
  kind: 'stack',
  items: [...items],
  capacity,
  highlights: top && items.length ? [{ index: items.length - 1, role: top }] : [],
  ...extra,
});

export const stackOperations: AlgorithmDef = {
  id: 'stack-operations',
  name: 'Stack operations',
  category: 'stacks',
  visual: 'stack',
  summary:
    'LIFO: push adds to the top, pop removes from the top. A fixed capacity reports overflow and underflow.',
  pseudocode: [
    'push(x): if size == capacity: overflow; else items[top++] = x',
    'pop():   if size == 0: underflow; else return items[--top]',
    'peek():  if size == 0: underflow; else return items[top - 1]',
    'isEmpty(): return size == 0',
    'isFull():  return size == capacity',
    'size():    return top',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(capacity)' },
  inputs: [
    { key: 'script', label: 'Operations', type: 'text', maxLength: 200 },
    { key: 'capacity', label: 'Capacity', type: 'number', min: 1, max: 10 },
  ],
  defaultInput: {
    script: 'push 5, push 8, peek, push 3, pop, size, push 9, isfull, pop, pop, pop, pop, isempty',
    capacity: 4,
  },
  run(input) {
    const ops = parseScript(str(input, 'script', 200), {
      push: true,
      pop: false,
      peek: false,
      isempty: false,
      isfull: false,
      size: false,
    });
    const cap = num(input, 'capacity', { min: 1, max: 10 });
    const items: number[] = [];
    const rec = new TraceRecorder<StackState>('stack-operations', { script: input.script, capacity: cap });
    rec.snap('INIT', `Empty stack with capacity ${cap}.`, st(items, cap), {
      vars: { top: 0, capacity: cap },
    });
    const log: string[] = [];
    for (const { op, arg } of ops) {
      const vars = () => ({ top: items.length, capacity: cap });
      switch (op) {
        case 'push':
          if (items.length >= cap) {
            rec.snap(
              'OVERFLOW',
              `push ${arg}: stack overflow — the stack is full.`,
              st(items, cap, 'error'),
              { line: 1, vars: vars() },
            );
            log.push('overflow');
          } else {
            items.push(arg!);
            rec.snap('PUSH', `push ${arg}: placed on top.`, st(items, cap, 'write'), {
              line: 1,
              vars: vars(),
            });
            log.push(`push ${arg}`);
          }
          break;
        case 'pop':
          if (!items.length) {
            rec.snap('UNDERFLOW', 'pop: stack underflow — the stack is empty.', st(items, cap), {
              line: 2,
              vars: vars(),
            });
            log.push('underflow');
          } else {
            rec.snap('PEEK', `pop: the top is ${items[items.length - 1]}.`, st(items, cap, 'error'), {
              line: 2,
              vars: vars(),
            });
            const v = items.pop()!;
            rec.snap('POP', `Removed ${v}.`, st(items, cap, 'active'), {
              line: 2,
              vars: { ...vars(), popped: v },
            });
            log.push(`pop → ${v}`);
          }
          break;
        case 'peek':
          if (!items.length)
            rec.snap('UNDERFLOW', 'peek: the stack is empty.', st(items, cap), { line: 3, vars: vars() });
          else
            rec.snap(
              'PEEK',
              `peek: top is ${items[items.length - 1]} (not removed).`,
              st(items, cap, 'found'),
              { line: 3, vars: { ...vars(), peek: items[items.length - 1] } },
            );
          log.push(`peek → ${items[items.length - 1] ?? 'empty'}`);
          break;
        case 'isempty':
          rec.snap('PEEK', `isEmpty → ${items.length === 0}.`, st(items, cap), {
            line: 4,
            vars: { ...vars(), isEmpty: items.length === 0 },
          });
          log.push(`isEmpty → ${items.length === 0}`);
          break;
        case 'isfull':
          rec.snap('PEEK', `isFull → ${items.length === cap}.`, st(items, cap), {
            line: 5,
            vars: { ...vars(), isFull: items.length === cap },
          });
          log.push(`isFull → ${items.length === cap}`);
          break;
        case 'size':
          rec.snap('PEEK', `size → ${items.length}.`, st(items, cap), {
            line: 6,
            vars: { ...vars(), size: items.length },
          });
          log.push(`size → ${items.length}`);
          break;
      }
    }
    return rec.finish(items, `Final stack (bottom → top): [${items.join(', ')}].`, st(items, cap));
  },
};

export const reverseStack: AlgorithmDef = {
  id: 'stack-reverse',
  name: 'Reverse a stack',
  category: 'stacks',
  visual: 'stack',
  summary: 'Pop everything into an auxiliary stack; the order flips.',
  pseudocode: ['aux = empty stack', 'while s not empty:', '    aux.push(s.pop())', 'return aux'],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  inputs: [{ key: 'values', label: 'Stack (bottom → top)', type: 'numbers', maxLength: 10 }],
  defaultInput: { values: [1, 2, 3, 4, 5] },
  randomInput: (seed) => ({ values: randomInts(seed, 6) }),
  run(input) {
    const s = nums(input, 'values', { max: 10 });
    const aux: number[] = [];
    const rec = new TraceRecorder<StackState>('stack-reverse', { values: s });
    const view = (role?: 'active' | 'write') =>
      st(s, null, role, { side: { label: 'aux', items: [...aux] } });
    rec.snap('INIT', 'Original stack on the left, empty auxiliary stack on the right.', view(), { line: 1 });
    while (s.length) {
      rec.snap('PEEK', `Pop ${s[s.length - 1]} from the original.`, view('active'), { line: 3 });
      const v = s.pop()!;
      aux.push(v);
      rec.snap('PUSH', `Push ${v} onto aux.`, view(), { line: 3, vars: { moved: v } });
    }
    return rec.finish(aux, `Reversed: top is now ${aux[aux.length - 1] ?? 'empty'}.`, st(aux, null, 'found'));
  },
};

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export const balancedBrackets: AlgorithmDef = {
  id: 'stack-balanced-brackets',
  name: 'Balanced brackets',
  category: 'stacks',
  visual: 'stack',
  summary: 'Push every opener; every closer must match the opener on top.',
  pseudocode: [
    'for ch in s:',
    '    if ch is an opener: push(ch)',
    '    else if ch is a closer:',
    '        if stack empty or top != match(ch): return false',
    '        pop()',
    'return stack is empty',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  inputs: [{ key: 'expr', label: 'Expression', type: 'text', maxLength: 30 }],
  defaultInput: { expr: '{[()()]}' },
  run(input) {
    const expr = str(input, 'expr', 30);
    const tokens = [...expr];
    const items: string[] = [];
    const rec = new TraceRecorder<StackState>('stack-balanced-brackets', { expr });
    const view = (i: number | null, role?: 'active' | 'found' | 'error' | 'write') =>
      st(items, null, role, { tape: { label: 'input', tokens, cursor: i } });
    rec.snap('INIT', `Check "${expr}".`, view(null), { line: 1 });
    for (let i = 0; i < tokens.length; i++) {
      const ch = tokens[i];
      if ('([{'.includes(ch)) {
        items.push(ch);
        rec.snap('PUSH', `'${ch}' opens — push it.`, view(i, 'write'), { line: 2, vars: { i, ch } });
      } else if (ch in PAIRS) {
        const top = items[items.length - 1];
        rec.snap('COMPARE', `'${ch}' closes — top is ${top ? `'${top}'` : 'empty'}.`, view(i, 'active'), {
          line: 4,
          vars: { i, ch, top: top ?? null },
        });
        if (top !== PAIRS[ch]) {
          rec.snap('ERROR', `Mismatch at position ${i}: not balanced.`, view(i, 'error'), { line: 4 });
          return rec.finish(false, 'Not balanced.', view(i, 'error'), 4);
        }
        items.pop();
        rec.snap('POP', `Matched '${PAIRS[ch]}${ch}' — pop.`, view(i), { line: 5, vars: { i } });
      }
    }
    const ok = items.length === 0;
    rec.snap(
      ok ? 'FOUND' : 'ERROR',
      ok ? 'Stack empty — balanced.' : 'Unclosed openers remain — not balanced.',
      view(null, ok ? undefined : 'error'),
      { line: 6 },
    );
    return rec.finish(ok, ok ? 'Balanced.' : 'Not balanced.', view(null), 6);
  },
};

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };

export function tokenizeExpr(expr: string): string[] {
  const tokens = expr.match(/\d+|[A-Za-z]|[-+*/^()]|\S/g) ?? [];
  for (const t of tokens)
    if (!/^(\d+|[A-Za-z]|[-+*/^()])$/.test(t)) throw new InputError(`Unexpected character "${t}"`);
  return tokens;
}

export const infixToPostfix: AlgorithmDef = {
  id: 'stack-infix-postfix',
  name: 'Infix → postfix',
  category: 'stacks',
  visual: 'stack',
  summary: 'Shunting-yard: operands go to output; operators wait on a stack until precedence lets them out.',
  pseudocode: [
    'for token in expr:',
    '    if operand: output.append(token)',
    "    else if '(': push",
    "    else if ')': pop to output until '('; discard '('",
    '    else operator: pop while top has higher precedence (or equal and left-assoc); push',
    'pop remaining operators to output',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  assumptions: ['Single letters or integers as operands; + - * / ^ operators; ^ is right-associative.'],
  inputs: [{ key: 'expr', label: 'Infix expression', type: 'text', maxLength: 40 }],
  defaultInput: { expr: 'a+b*(c^d-e)^(f+g*h)-i' },
  run(input) {
    const expr = str(input, 'expr', 40);
    const tokens = tokenizeExpr(expr);
    const ops: string[] = [];
    const out: string[] = [];
    const rec = new TraceRecorder<StackState>('stack-infix-postfix', { expr });
    const view = (i: number | null, role?: 'write' | 'active') =>
      st(ops, null, role, {
        tape: { label: 'infix', tokens, cursor: i },
        output: { label: 'postfix', tokens: [...out] },
      });
    rec.snap('INIT', 'Scan tokens left to right.', view(null), { line: 1 });
    tokens.forEach((t, i) => {
      if (/^(\d+|[A-Za-z])$/.test(t)) {
        out.push(t);
        rec.snap('WRITE', `Operand ${t} → output.`, view(i), { line: 2, vars: { token: t } });
      } else if (t === '(') {
        ops.push(t);
        rec.snap('PUSH', "Push '('.", view(i, 'write'), { line: 3, vars: { token: t } });
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') {
          out.push(ops.pop()!);
          rec.snap('POP', `Pop ${out[out.length - 1]} to output.`, view(i), { line: 4, vars: { token: t } });
        }
        if (!ops.length) throw new InputError('Mismatched parentheses.');
        ops.pop();
        rec.snap('POP', "Discard '('.", view(i), { line: 4 });
      } else {
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top === '(' || !(PREC[top] > PREC[t] || (PREC[top] === PREC[t] && t !== '^'))) break;
          out.push(ops.pop()!);
          rec.snap('POP', `${top} has higher/equal precedence than ${t} — pop to output.`, view(i), {
            line: 5,
            vars: { token: t, top },
          });
        }
        ops.push(t);
        rec.snap('PUSH', `Push operator ${t}.`, view(i, 'write'), { line: 5, vars: { token: t } });
      }
    });
    while (ops.length) {
      const o = ops.pop()!;
      if (o === '(') throw new InputError('Mismatched parentheses.');
      out.push(o);
      rec.snap('POP', `Flush ${o} to output.`, view(null), { line: 6 });
    }
    return rec.finish(out.join(' '), `Postfix: ${out.join(' ')}`, view(null));
  },
};

export const postfixEval: AlgorithmDef = {
  id: 'stack-postfix-eval',
  name: 'Evaluate postfix',
  category: 'stacks',
  visual: 'stack',
  summary: 'Push numbers; an operator pops two operands, applies itself, and pushes the result.',
  pseudocode: [
    'for token in tokens:',
    '    if number: push(token)',
    '    else: b = pop(); a = pop(); push(a op b)',
    'return pop()',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  assumptions: ['Space-separated integers and + - * / operators. Division truncates toward zero.'],
  inputs: [{ key: 'expr', label: 'Postfix tokens', type: 'text', maxLength: 60 }],
  defaultInput: { expr: '2 3 1 * + 9 -' },
  run(input) {
    const expr = str(input, 'expr', 60);
    const tokens = expr.trim().split(/\s+/).filter(Boolean);
    const items: number[] = [];
    const rec = new TraceRecorder<StackState>('stack-postfix-eval', { expr });
    const view = (i: number | null, role?: 'write' | 'active' | 'found') =>
      st(items, null, role, { tape: { label: 'postfix', tokens, cursor: i } });
    rec.snap('INIT', 'Evaluate left to right.', view(null), { line: 1 });
    tokens.forEach((t, i) => {
      if (/^-?\d+$/.test(t)) {
        items.push(Number(t));
        rec.snap('PUSH', `Push ${t}.`, view(i, 'write'), { line: 2 });
      } else if (/^[-+*/]$/.test(t)) {
        if (items.length < 2) throw new InputError(`Operator ${t} needs two operands.`);
        const b = items.pop()!;
        const a = items.pop()!;
        if (t === '/' && b === 0) throw new InputError('Division by zero.');
        const r = t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b);
        rec.snap('POP', `Pop b = ${b} and a = ${a}.`, view(i), { line: 3, vars: { a, b } });
        items.push(r);
        rec.snap('PUSH', `${a} ${t} ${b} = ${r}; push it.`, view(i, 'write'), {
          line: 3,
          vars: { a, b, result: r },
        });
      } else throw new InputError(`Bad token "${t}".`);
    });
    if (items.length !== 1) throw new InputError('Malformed postfix expression.');
    return rec.finish(items[0], `Result = ${items[0]}.`, view(null, 'found'), 4);
  },
};

export const nextGreater: AlgorithmDef = {
  id: 'stack-next-greater',
  name: 'Next greater element',
  category: 'stacks',
  visual: 'stack',
  summary:
    'A monotonic decreasing stack of indices: each new value resolves every smaller value waiting on the stack.',
  pseudocode: [
    'ans = [-1] * n; stack = []',
    'for i from 0 to n - 1:',
    '    while stack and a[stack.top] < a[i]:',
    '        ans[stack.pop()] = a[i]',
    '    stack.push(i)',
    'return ans',
  ],
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
  inputs: [{ key: 'values', label: 'Array', type: 'numbers', maxLength: 12 }],
  defaultInput: { values: [4, 5, 2, 25, 7, 8] },
  randomInput: (seed) => ({ values: randomInts(seed, 8) }),
  run(input) {
    const a = nums(input, 'values', { max: 12 });
    const ans = a.map(() => -1);
    const stack: number[] = [];
    const rec = new TraceRecorder<StackState>('stack-next-greater', { values: a });
    const view = (i: number | null, role?: 'write' | 'active' | 'error') =>
      st(
        stack.map((k) => `${a[k]}@${k}`),
        null,
        role,
        {
          tape: { label: 'array', tokens: a.map(String), cursor: i },
          output: { label: 'answer', tokens: ans.map(String) },
        },
      );
    rec.snap('INIT', 'All answers start at -1.', view(null), { line: 1 });
    a.forEach((x, i) => {
      while (stack.length && a[stack[stack.length - 1]] < x) {
        rec.snap(
          'COMPARE',
          `${a[stack[stack.length - 1]]} < ${x}: ${x} is its next greater element.`,
          view(i, 'error'),
          { line: 3, vars: { i, x } },
        );
        ans[stack.pop()!] = x;
        rec.snap('POP', 'Record the answer and pop.', view(i), { line: 4, vars: { i } });
      }
      stack.push(i);
      rec.snap('PUSH', `Push index ${i} (${x}); it waits for a greater value.`, view(i, 'write'), {
        line: 5,
        vars: { i },
      });
    });
    return rec.finish(ans, `Answer: [${ans.join(', ')}].`, view(null));
  },
};

export const minStack: AlgorithmDef = {
  id: 'stack-min',
  name: 'Min stack',
  category: 'stacks',
  visual: 'stack',
  summary: 'Keep a second stack of running minimums so getMin is O(1).',
  pseudocode: [
    'push(x): main.push(x); mins.push(min(x, mins.top))',
    'pop(): main.pop(); mins.pop()',
    'getMin(): return mins.top',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
  inputs: [{ key: 'script', label: 'Operations', type: 'text', maxLength: 200 }],
  defaultInput: { script: 'push 5, push 3, getmin, push 7, push 2, getmin, pop, getmin, pop, pop, getmin' },
  run(input) {
    const ops = parseScript(str(input, 'script', 200), { push: true, pop: false, getmin: false });
    const main: number[] = [];
    const mins: number[] = [];
    const rec = new TraceRecorder<StackState>('stack-min', { script: input.script });
    const view = (role?: 'write' | 'found' | 'active') =>
      st(main, null, role, { side: { label: 'mins', items: [...mins] } });
    rec.snap('INIT', 'Main stack and min stack start empty.', view(), { line: 1 });
    for (const { op, arg } of ops) {
      if (op === 'push') {
        main.push(arg!);
        mins.push(mins.length ? Math.min(arg!, mins[mins.length - 1]) : arg!);
        rec.snap('PUSH', `push ${arg}; running min is ${mins[mins.length - 1]}.`, view('write'), {
          line: 1,
          vars: { min: mins[mins.length - 1] },
        });
      } else if (op === 'pop') {
        if (!main.length) rec.snap('UNDERFLOW', 'pop on empty stack.', view(), { line: 2 });
        else {
          const v = main.pop();
          mins.pop();
          rec.snap('POP', `pop ${v}.`, view(), { line: 2, vars: { min: mins[mins.length - 1] ?? null } });
        }
      } else {
        if (!mins.length) rec.snap('UNDERFLOW', 'getMin on empty stack.', view(), { line: 3 });
        else
          rec.snap('PEEK', `getMin → ${mins[mins.length - 1]} in O(1).`, view('found'), {
            line: 3,
            vars: { min: mins[mins.length - 1] },
          });
      }
    }
    return rec.finish(mins[mins.length - 1] ?? null, 'Done.', view());
  },
};

export const STACK_ALGORITHMS: AlgorithmDef[] = [
  stackOperations,
  reverseStack,
  balancedBrackets,
  infixToPostfix,
  postfixEval,
  nextGreater,
  minStack,
];
