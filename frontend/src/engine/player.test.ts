import { describe, expect, it } from 'vitest';
import { linearSearch } from '@/algorithms/searching';
import { bubbleSort } from '@/algorithms/sorting';
import { createPlayerStore } from './player';
import { validateTrace } from './validate';

describe('player store', () => {
  it('steps, seeks, clamps and restarts deterministically', () => {
    const p = createPlayerStore();
    const t = linearSearch.run({ values: [1, 2, 3], target: 3 });
    p.getState().load(t);
    expect(p.getState().index).toBe(0);
    p.getState().next();
    p.getState().next();
    expect(p.getState().index).toBe(2);
    p.getState().prev();
    expect(p.getState().index).toBe(1);
    p.getState().seek(999);
    expect(p.getState().index).toBe(t.steps.length - 1);
    p.getState().seek(-5);
    expect(p.getState().index).toBe(0);
    p.getState().restart();
    expect(p.getState()).toMatchObject({ index: 0, playing: true });
  });

  it('seeking reproduces the exact snapshot regardless of history', () => {
    const p = createPlayerStore();
    const t = bubbleSort.run({ values: [5, 1, 4, 2] });
    p.getState().load(t);
    for (let i = 0; i < 7; i++) p.getState().next();
    const viaSteps = p.getState().trace!.steps[p.getState().index].state;
    p.getState().seek(0);
    p.getState().seek(7);
    expect(p.getState().trace!.steps[p.getState().index].state).toEqual(viaSteps);
  });

  it('pausing does not mutate state and ticks stop at the end', () => {
    const p = createPlayerStore();
    p.getState().load(linearSearch.run({ values: [1], target: 1 }));
    const gen = p.getState().generation;
    p.getState().play();
    p.getState().pause();
    const before = JSON.stringify(p.getState().trace);
    p.getState().tick(gen);
    expect(p.getState().index).toBe(0); // paused: tick ignored
    expect(JSON.stringify(p.getState().trace)).toBe(before);
    p.getState().play();
    for (let i = 0; i < 10; i++) p.getState().tick(gen);
    expect(p.getState().playing).toBe(false);
    expect(p.getState().index).toBe(p.getState().trace!.steps.length - 1);
  });

  it('ignores stale ticks from a previously loaded trace', () => {
    const p = createPlayerStore();
    p.getState().load(linearSearch.run({ values: [1, 2, 3], target: 9 }));
    const oldGen = p.getState().generation;
    p.getState().load(linearSearch.run({ values: [4, 5, 6], target: 9 }));
    p.getState().play();
    p.getState().tick(oldGen);
    expect(p.getState().index).toBe(0);
  });

  it('play from the last step restarts from the beginning', () => {
    const p = createPlayerStore();
    const t = linearSearch.run({ values: [1], target: 1 });
    p.getState().load(t);
    p.getState().seek(t.steps.length - 1);
    p.getState().play();
    expect(p.getState().index).toBe(0);
  });
});

describe('trace validation', () => {
  it('rejects malformed traces from untrusted sources', () => {
    const good = linearSearch.run({ values: [1], target: 1 });
    expect(validateTrace(good).ok).toBe(true);
    expect(validateTrace(null).ok).toBe(false);
    expect(validateTrace({ ...good, schemaVersion: '9.9' }).ok).toBe(false);
    expect(validateTrace({ ...good, algorithm: '<script>' }).ok).toBe(false);
    expect(
      validateTrace({ ...good, steps: good.steps.map((s) => ({ ...s, operation: 'EVAL_JS' })) }).ok,
    ).toBe(false);
    expect(validateTrace({ ...good, steps: good.steps.map((s) => ({ ...s, done: false })) }).ok).toBe(false);
    const mixed = {
      ...good,
      steps: good.steps.map((s, i) =>
        i === 0 ? { ...s, state: { kind: 'grid', cells: [], highlights: [] } } : s,
      ),
    };
    expect(validateTrace(mixed).errors.join(' ')).toMatch(/changes visual kind/);
  });
});
