import { describe, expect, it } from 'vitest';
import { hashTableOps, hashKey, parseHashScript } from './hashTable';
import {
  llDeleteAt,
  llDeleteTail,
  llDetectCycle,
  llInsertAt,
  llInsertHead,
  llInsertTail,
  llMergeSorted,
  llMiddle,
  llRemoveDuplicates,
  llReverse,
  llSearch,
  llTraverse,
  llUpdate,
  llDeleteHead,
} from './linkedList';
import { queueOperations } from './queue';
import {
  balancedBrackets,
  infixToPostfix,
  minStack,
  nextGreater,
  parseScript,
  postfixEval,
  reverseStack,
  stackOperations,
} from './stack';
import type { LinkedListState } from '@/engine/types';

const variants = ['singly', 'doubly', 'circular'] as const;

describe('linked lists', () => {
  it.each(variants)('%s insert/delete keep order', (variant) => {
    expect(llInsertHead.run({ variant, values: [3, 7], value: 1 }).result).toEqual([1, 3, 7]);
    expect(llInsertTail.run({ variant, values: [3, 7], value: 9 }).result).toEqual([3, 7, 9]);
    expect(llInsertTail.run({ variant, values: [], value: 9 }).result).toEqual([9]);
    expect(llInsertAt.run({ variant, values: [3, 7, 9], index: 3, value: 10 }).result).toEqual([3, 7, 9, 10]);
    expect(llInsertAt.run({ variant, values: [3, 7, 9], index: 1, value: 5 }).result).toEqual([3, 5, 7, 9]);
    expect(llDeleteHead.run({ variant, values: [3, 7] }).result).toEqual([7]);
    expect(llDeleteHead.run({ variant, values: [] }).result).toEqual([]);
    expect(llDeleteTail.run({ variant, values: [3, 7, 9] }).result).toEqual([3, 7]);
    expect(llDeleteTail.run({ variant, values: [3] }).result).toEqual([]);
    expect(llDeleteAt.run({ variant, values: [3, 7, 9], index: 2 }).result).toEqual([3, 7]);
    expect(llDeleteAt.run({ variant, values: [3, 7, 9], index: 0 }).result).toEqual([7, 9]);
    expect(llUpdate.run({ variant, values: [3, 7, 9], index: 1, value: 0 }).result).toEqual([3, 0, 9]);
    expect(llTraverse.run({ variant, values: [3, 7, 9] }).result).toEqual([3, 7, 9]);
    expect(
      llSearch.run({ variant, values: [3, 7, 9], target: 9 }).steps.some((s) => s.operation === 'FOUND'),
    ).toBe(true);
  });

  it('circular lists keep tail.next === head after mutations', () => {
    for (const t of [
      llInsertHead.run({ variant: 'circular', values: [1, 2], value: 0 }),
      llInsertTail.run({ variant: 'circular', values: [1, 2], value: 3 }),
      llDeleteHead.run({ variant: 'circular', values: [1, 2, 3] }),
      llDeleteTail.run({ variant: 'circular', values: [1, 2, 3] }),
      llDeleteAt.run({ variant: 'circular', values: [1, 2, 3], index: 2 }),
    ]) {
      const s = t.steps[t.steps.length - 1].state as LinkedListState;
      expect(s.next[s.tail!]).toBe(s.head);
    }
  });

  it('doubly lists keep prev pointers consistent', () => {
    const t = llInsertAt.run({ variant: 'doubly', values: [1, 2, 4], index: 2, value: 3 });
    const s = t.steps[t.steps.length - 1].state as LinkedListState;
    let cur = s.head;
    let prev: string | null = null;
    while (cur) {
      expect(s.prev![cur]).toBe(prev);
      prev = cur;
      cur = s.next[cur];
    }
  });

  it('reverse, middle, cycle, dedupe, merge', () => {
    expect(llReverse.run({ values: [1, 2, 3, 4] }).result).toEqual([4, 3, 2, 1]);
    expect(llReverse.run({ values: [] }).result).toEqual([]);
    const mid = llMiddle.run({ values: [1, 2, 3, 4, 5] });
    expect(mid.steps.at(-2)!.explanation).toMatch(/Middle node is 3/);
    expect(llDetectCycle.run({ values: [3, 2, 0, -4], cyclePos: 1 }).result).toBe(true);
    expect(llDetectCycle.run({ values: [3, 2, 0, -4], cyclePos: -1 }).result).toBe(false);
    expect(llDetectCycle.run({ values: [1], cyclePos: 0 }).result).toBe(true);
    expect(llRemoveDuplicates.run({ values: [1, 1, 2, 3, 3] }).result).toEqual([1, 2, 3]);
    expect(llMergeSorted.run({ a: [1, 4, 7], b: [2, 3, 8] }).result).toEqual([1, 2, 3, 4, 7, 8]);
    expect(llMergeSorted.run({ a: [], b: [2] }).result).toEqual([2]);
  });
});

describe('stacks', () => {
  it('parses scripts and rejects unknown verbs', () => {
    expect(parseScript('push 3, pop', { push: true, pop: false })).toEqual([
      { op: 'push', arg: 3 },
      { op: 'pop', arg: null },
    ]);
    expect(() => parseScript('rm -rf', { push: true })).toThrow(/Unknown/);
    expect(() => parseScript('push', { push: true })).toThrow(/needs a number/);
  });
  it('reports overflow and underflow', () => {
    const t = stackOperations.run({ script: 'push 1, push 2, push 3, pop, pop, pop', capacity: 2 });
    expect(t.steps.some((s) => s.operation === 'OVERFLOW')).toBe(true);
    expect(t.steps.some((s) => s.operation === 'UNDERFLOW')).toBe(true);
    expect(t.result).toEqual([]);
  });
  it('classic stack algorithms', () => {
    expect(balancedBrackets.run({ expr: '{[()()]}' }).result).toBe(true);
    expect(balancedBrackets.run({ expr: '([)]' }).result).toBe(false);
    expect(balancedBrackets.run({ expr: '((' }).result).toBe(false);
    expect(balancedBrackets.run({ expr: '' }).result).toBe(true);
    expect(infixToPostfix.run({ expr: 'a+b*c' }).result).toBe('a b c * +');
    expect(infixToPostfix.run({ expr: '(a+b)*c' }).result).toBe('a b + c *');
    expect(infixToPostfix.run({ expr: 'a^b^c' }).result).toBe('a b c ^ ^');
    expect(() => infixToPostfix.run({ expr: '(a+b' })).toThrow(/parentheses/);
    expect(postfixEval.run({ expr: '2 3 1 * + 9 -' }).result).toBe(-4);
    expect(() => postfixEval.run({ expr: '1 0 /' })).toThrow(/zero/);
    expect(nextGreater.run({ values: [4, 5, 2, 25] }).result).toEqual([5, 25, 25, -1]);
    expect(minStack.run({ script: 'push 5, push 3, push 7, pop, pop' }).result).toBe(5);
    expect(reverseStack.run({ values: [1, 2, 3] }).result).toEqual([3, 2, 1]);
  });
});

describe('queues', () => {
  const run = (variant: string, script: string, capacity = 4) =>
    queueOperations.run({ variant, script, capacity });
  it('linear queue cannot reuse freed slots', () => {
    const t = run('linear', 'enqueue 1, enqueue 2, enqueue 3, enqueue 4, dequeue, enqueue 5');
    expect(t.steps.some((s) => s.operation === 'OVERFLOW')).toBe(true);
    expect(t.result).toEqual([2, 3, 4]);
  });
  it('circular queue wraps around', () => {
    const t = run('circular', 'enqueue 1, enqueue 2, enqueue 3, enqueue 4, dequeue, enqueue 5');
    expect(t.result).toEqual([2, 3, 4, 5]);
    expect(t.steps.some((s) => s.explanation.includes('wrapped'))).toBe(true);
  });
  it('deque works on both ends', () => {
    expect(run('deque', 'pushback 1, pushfront 0, pushback 2, popback, pushfront 9').result).toEqual([
      9, 0, 1,
    ]);
  });
  it('priority queue serves the smallest first', () => {
    expect(run('priority', 'enqueue 5, enqueue 1, enqueue 3, dequeue').result).toEqual([3, 5]);
  });
  it('underflow on empty dequeue', () => {
    expect(run('circular', 'dequeue').steps.some((s) => s.operation === 'UNDERFLOW')).toBe(true);
  });
});

describe('hash tables', () => {
  it('hash is deterministic and in range', () => {
    expect(hashKey('cat', 7).index).toBe(hashKey('cat', 7).index);
    for (const k of ['a', 'zebra', 'x1']) expect(hashKey(k, 5).index).toBeLessThan(5);
  });
  it('script parser validates input', () => {
    expect(parseHashScript('put a 1, get a')).toHaveLength(2);
    expect(() => parseHashScript('put a')).toThrow();
    expect(() => parseHashScript('drop table')).toThrow();
  });
  it.each(['chaining', 'linear-probing'])('%s behaves like a map', (strategy) => {
    const t = hashTableOps.run({
      strategy,
      capacity: 3,
      script: 'put a 1, put b 2, put c 3, put d 4, put a 9, remove b, put e 5, get c',
    });
    expect(t.result).toEqual({ a: 9, c: 3, d: 4, e: 5 });
    expect(t.steps.some((s) => s.operation === 'RESIZE')).toBe(true);
    const found = t.steps.filter((s) => s.operation === 'FOUND');
    expect(found.at(-1)!.explanation).toMatch(/get\("c"\) → 3/);
  });
  it('probing uses tombstones so lookups continue past deleted slots', () => {
    const t = hashTableOps.run({
      strategy: 'linear-probing',
      capacity: 13,
      script: 'put a 1, put n 2, remove a, get n',
    });
    expect(t.steps.at(-2)!.operation).toBe('FOUND');
  });
});
