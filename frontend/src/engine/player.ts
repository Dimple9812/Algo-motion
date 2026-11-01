import { useEffect } from 'react';
import { create } from 'zustand';
import type { Trace } from './types';

export const SPEEDS = [0.5, 1, 1.5, 2] as const;
/** UI offers SPEEDS; races and demos may use faster multipliers. */
export type Speed = number;

/** Base delay between steps at 1x. Purely presentational: never used for algorithm logic. */
export const BASE_STEP_MS = 900;

export interface PlayerState {
  trace: Trace | null;
  index: number;
  playing: boolean;
  speed: Speed;
  /** bumps every time a new trace is loaded so stale timers can detect replacement */
  generation: number;
  load: (trace: Trace) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (i: number) => void;
  restart: () => void;
  reset: () => void;
  setSpeed: (s: Speed) => void;
  tick: (generation: number) => void;
}

const clamp = (i: number, trace: Trace | null) =>
  trace ? Math.max(0, Math.min(trace.steps.length - 1, Math.trunc(i))) : 0;

export const createPlayerStore = () =>
  create<PlayerState>((set, get) => ({
    trace: null,
    index: 0,
    playing: false,
    speed: 1,
    generation: 0,
    load: (trace) => set((s) => ({ trace, index: 0, playing: false, generation: s.generation + 1 })),
    play: () => {
      const { trace, index } = get();
      if (!trace) return;
      // Playing from the final step restarts from the beginning.
      if (index >= trace.steps.length - 1) set({ index: 0, playing: true });
      else set({ playing: true });
    },
    pause: () => set({ playing: false }),
    toggle: () => (get().playing ? get().pause() : get().play()),
    next: () => set((s) => ({ index: clamp(s.index + 1, s.trace), playing: false })),
    prev: () => set((s) => ({ index: clamp(s.index - 1, s.trace), playing: false })),
    seek: (i) => set((s) => ({ index: clamp(i, s.trace), playing: false })),
    restart: () => set({ index: 0, playing: true }),
    reset: () => set({ index: 0, playing: false }),
    setSpeed: (speed) => set({ speed }),
    tick: (generation) => {
      const s = get();
      // Ignore ticks scheduled for a previous trace (prevents stale callbacks).
      if (!s.playing || !s.trace || generation !== s.generation) return;
      if (s.index >= s.trace.steps.length - 1) set({ playing: false });
      else set({ index: s.index + 1 });
    },
  }));

export type PlayerStore = ReturnType<typeof createPlayerStore>;

/** Shared player used by the main visualizer. Small embedded players create their own store. */
export const usePlayer = createPlayerStore();

/** Drives playback for a player store. One timer at a time; cleaned up on every change. */
export function usePlaybackClock(store: PlayerStore): void {
  const playing = store((s) => s.playing);
  const speed = store((s) => s.speed);
  const index = store((s) => s.index);
  const generation = store((s) => s.generation);
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => store.getState().tick(generation), BASE_STEP_MS / speed);
    return () => window.clearTimeout(id);
  }, [playing, speed, index, generation, store]);
}
