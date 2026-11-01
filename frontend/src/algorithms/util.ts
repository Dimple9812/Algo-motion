import { InputError } from '@/engine/recorder';
import type { AlgoInput } from './types';

/** Deterministic PRNG (mulberry32) so "random" inputs are reproducible from a seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInts(seed: number, n: number, lo = 1, hi = 99): number[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
}

export function sortedRandomInts(seed: number, n: number, lo = 1, hi = 99): number[] {
  return randomInts(seed, n, lo, hi).sort((a, b) => a - b);
}

export const MAX_ARRAY = 24;

export function nums(input: AlgoInput, key: string, opts: { min?: number; max?: number } = {}): number[] {
  const v = input[key];
  if (!Array.isArray(v)) throw new InputError(`${key} must be a list of numbers`);
  const out = v.map(Number);
  if (out.some((x) => !Number.isFinite(x) || !Number.isInteger(x)))
    throw new InputError(`${key} must contain whole numbers only`);
  if (out.length > (opts.max ?? MAX_ARRAY))
    throw new InputError(`${key} can have at most ${opts.max ?? MAX_ARRAY} values`);
  if (out.length < (opts.min ?? 0)) throw new InputError(`${key} needs at least ${opts.min} values`);
  if (out.some((x) => Math.abs(x) > 9999)) throw new InputError('Values must be between -9999 and 9999');
  return out;
}

export function num(input: AlgoInput, key: string, opts: { min?: number; max?: number } = {}): number {
  const x = Number(input[key]);
  if (!Number.isFinite(x) || !Number.isInteger(x)) throw new InputError(`${key} must be a whole number`);
  if (opts.min !== undefined && x < opts.min) throw new InputError(`${key} must be ≥ ${opts.min}`);
  if (opts.max !== undefined && x > opts.max) throw new InputError(`${key} must be ≤ ${opts.max}`);
  return x;
}

export function str(input: AlgoInput, key: string, maxLength = 40): string {
  const v = input[key];
  if (typeof v !== 'string') throw new InputError(`${key} must be text`);
  if (v.length > maxLength) throw new InputError(`${key} can be at most ${maxLength} characters`);
  return v;
}

export function words(input: AlgoInput, key: string, max = 8): string[] {
  const v = input[key];
  const list = Array.isArray(v) ? v.map(String) : String(v ?? '').split(/[\s,]+/);
  const out = list.map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (out.length > max) throw new InputError(`At most ${max} words`);
  if (out.some((w) => !/^[a-z]{1,12}$/.test(w))) throw new InputError('Words must be 1–12 letters a–z');
  return out;
}

export function isSortedAsc(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) if (values[i - 1] > values[i]) return false;
  return true;
}

export function requireSorted(values: number[], what = 'This algorithm'): void {
  if (!isSortedAsc(values))
    throw new InputError(`${what} requires the array to be sorted in ascending order.`);
}
