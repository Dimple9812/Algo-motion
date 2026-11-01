import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './prefs';

/**
 * Learning progress. XP is awarded at most once per unique achievement key
 * (e.g. "challenge:find-number:3"), so repeating a trivial action never farms XP.
 * When signed in, events are also sent to the backend (see api/progressSync.ts),
 * which applies the same idempotency rule server-side.
 */

export type XpKind = 'visualization' | 'challenge' | 'prediction' | 'problem' | 'path';

export const XP_VALUES: Record<XpKind, number> = {
  visualization: 5,
  prediction: 10,
  challenge: 25,
  problem: 50,
  path: 100,
};

export interface XpEvent {
  key: string;
  kind: XpKind;
  topic: string;
  xp: number;
  at: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  topics: string[];
  threshold: number;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'array-explorer',
    name: 'Array Explorer',
    description: 'Earn 30 XP in arrays & searching.',
    topics: ['arrays', 'searching'],
    threshold: 30,
    emoji: '🧭',
  },
  {
    id: 'pointer-pro',
    name: 'Pointer Pro',
    description: 'Earn 30 XP with linked lists.',
    topics: ['linked-lists'],
    threshold: 30,
    emoji: '🔗',
  },
  {
    id: 'stack-master',
    name: 'Stack Master',
    description: 'Earn 30 XP with stacks.',
    topics: ['stacks'],
    threshold: 30,
    emoji: '🧱',
  },
  {
    id: 'queue-navigator',
    name: 'Queue Navigator',
    description: 'Earn 20 XP with queues.',
    topics: ['queues'],
    threshold: 20,
    emoji: '🚂',
  },
  {
    id: 'tree-climber',
    name: 'Tree Climber',
    description: 'Earn 30 XP with trees, heaps or tries.',
    topics: ['trees', 'heaps', 'tries'],
    threshold: 30,
    emoji: '🌳',
  },
  {
    id: 'graph-pathfinder',
    name: 'Graph Pathfinder',
    description: 'Earn 30 XP with graphs.',
    topics: ['graphs'],
    threshold: 30,
    emoji: '🪐',
  },
  {
    id: 'sorting-specialist',
    name: 'Sorting Specialist',
    description: 'Earn 30 XP with sorting.',
    topics: ['sorting'],
    threshold: 30,
    emoji: '🏁',
  },
  {
    id: 'dp-detective',
    name: 'Dynamic Programming Detective',
    description: 'Earn 30 XP with dynamic programming.',
    topics: ['dynamic-programming'],
    threshold: 30,
    emoji: '🔍',
  },
  {
    id: 'interview-ready',
    name: 'Interview Ready',
    description: 'Solve problems worth 150 XP.',
    topics: ['problems'],
    threshold: 150,
    emoji: '🎓',
  },
];

interface ProgressState {
  events: XpEvent[];
  award: (key: string, kind: XpKind, topic: string) => XpEvent | null;
  reset: () => void;
  merge: (events: XpEvent[]) => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      events: [],
      award: (key, kind, topic) => {
        if (get().events.some((e) => e.key === key)) return null;
        const ev: XpEvent = { key, kind, topic, xp: XP_VALUES[kind], at: new Date().toISOString() };
        set((s) => ({ events: [...s.events, ev] }));
        return ev;
      },
      reset: () => set({ events: [] }),
      merge: (incoming) =>
        set((s) => {
          const keys = new Set(s.events.map((e) => e.key));
          return { events: [...s.events, ...incoming.filter((e) => !keys.has(e.key))] };
        }),
    }),
    { name: 'algomotion-progress', storage: safeStorage },
  ),
);

export function totalXp(events: XpEvent[]): number {
  return events.reduce((s, e) => s + e.xp, 0);
}

export function xpByTopic(events: XpEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    out[e.topic] = (out[e.topic] ?? 0) + e.xp;
    if (e.kind === 'problem') out.problems = (out.problems ?? 0) + e.xp;
  }
  return out;
}

export function earnedBadges(events: XpEvent[]): BadgeDef[] {
  const byTopic = xpByTopic(events);
  return BADGES.filter((b) => b.topics.reduce((s, t) => s + (byTopic[t] ?? 0), 0) >= b.threshold);
}

export function level(xp: number): { level: number; into: number; needed: number } {
  let lvl = 1;
  let need = 50;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    lvl++;
    need = Math.round(need * 1.4);
  }
  return { level: lvl, into: rest, needed: need };
}
