import { describe, expect, it } from 'vitest';
import { climbingStairs, coinChange, editDistance, fibMemo, knapsack, lcs, maxSubarray } from './dp';
import {
  answerSpaceSearch,
  kthLargest,
  longestUniqueSubstring,
  maxSumWindow,
  mergeIntervals,
  numberOfIslands,
  pairSumSorted,
  prefixSums,
  slidingWindowMax,
  twoSum,
} from './patterns';
import { combinationSum, factorial, nQueens, subsets, wordSearch } from './recursion';

describe('dynamic programming', () => {
  it('base cases and recurrences', () => {
    expect(climbingStairs.run({ n: 1 }).result).toBe(1);
    expect(climbingStairs.run({ n: 5 }).result).toBe(8);
    expect(coinChange.run({ coins: [1, 3, 4], amount: 6 }).result).toBe(2);
    expect(coinChange.run({ coins: [2], amount: 3 }).result).toBe(-1);
    expect(coinChange.run({ coins: [2], amount: 0 }).result).toBe(0);
    expect(lcs.run({ a: 'ABCBDAB', b: 'BDCABA' }).result).toHaveLength(4);
    expect(lcs.run({ a: 'abc', b: '' }).result).toBe('');
    expect(knapsack.run({ weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 }).result).toBe(9);
    expect(maxSubarray.run({ values: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }).result).toBe(6);
    expect(maxSubarray.run({ values: [-3, -1, -2] }).result).toBe(-1);
    expect(editDistance.run({ a: 'horse', b: 'ros' }).result).toBe(3);
  });
  it('memoization makes far fewer calls than naive recursion', () => {
    const memo = fibMemo.run({ n: 8, memo: 'true' });
    const naive = fibMemo.run({ n: 8, memo: 'false' });
    expect(memo.result).toBe(21);
    expect(naive.result).toBe(21);
    expect(memo.steps.filter((s) => s.operation === 'CALL').length).toBeLessThan(
      naive.steps.filter((s) => s.operation === 'CALL').length / 3,
    );
  });
});

describe('recursion & backtracking', () => {
  it('works', () => {
    expect(factorial.run({ n: 5 }).result).toBe(120);
    expect(factorial.run({ n: 0 }).result).toBe(1);
    expect((subsets.run({ values: [1, 2, 3] }).result as string[]).length).toBe(8);
    expect(combinationSum.run({ candidates: [2, 3, 6, 7], target: 7 }).result).toEqual(['[2,2,3]', '[7]']);
    expect(nQueens.run({ n: 4 }).result).toEqual([1, 3, 0, 2]);
    expect(wordSearch.run({ board: 'ABCE, SFCS, ADEE', word: 'ABCCED' }).result).toBe(true);
    expect(wordSearch.run({ board: 'ABCE, SFCS, ADEE', word: 'ABCB' }).result).toBe(false);
  });
});

describe('patterns', () => {
  it('works', () => {
    expect(twoSum.run({ values: [2, 7, 11, 15], target: 9 }).result).toEqual([0, 1]);
    expect(twoSum.run({ values: [1, 2], target: 9 }).result).toBeNull();
    expect(pairSumSorted.run({ values: [1, 3, 4, 6, 8, 11], target: 10 }).result).toEqual([2, 3]);
    expect(longestUniqueSubstring.run({ s: 'abcabcbb' }).result).toBe(3);
    expect(longestUniqueSubstring.run({ s: 'pwwkew' }).result).toBe(3);
    expect(longestUniqueSubstring.run({ s: '' }).result).toBe(0);
    expect(maxSumWindow.run({ values: [2, 1, 5, 1, 3, 2], k: 3 }).result).toBe(9);
    expect(prefixSums.run({ values: [3, 1, 4, 1, 5], l: 1, r: 3 }).result).toBe(6);
    expect(answerSpaceSearch.run({ values: [3, 6, 7, 11], h: 8 }).result).toBe(4);
    expect(mergeIntervals.run({ intervals: '1-3, 8-10, 2-6, 15-18' }).result).toEqual([
      '1–6',
      '8–10',
      '15–18',
    ]);
    expect(slidingWindowMax.run({ values: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 }).result).toEqual([
      3, 3, 5, 5, 6, 7,
    ]);
    expect(numberOfIslands.run({ grid: '11000, 11000, 00100, 00011' }).result).toBe(3);
    expect(kthLargest.run({ values: [3, 2, 1, 5, 6, 4], k: 2 }).result).toBe(5);
  });
});
