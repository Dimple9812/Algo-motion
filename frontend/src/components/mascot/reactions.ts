import type { CategoryId } from '@/algorithms/types';
import type { Operation, TraceStep } from '@/engine/types';
import type { CharacterId, MascotAnimation, Mood } from './Mascot';

/**
 * Central mapping from real events to character reactions.
 * Reactions are derived FROM trace steps or confirmed job states; they never
 * influence algorithm results. Fast playback suppresses movement.
 */

export type AppEvent =
  | 'COMPARE_ELEMENTS'
  | 'VALUE_FOUND'
  | 'VALUE_NOT_FOUND'
  | 'POINTER_UPDATED'
  | 'SWAP_PERFORMED'
  | 'TREE_ROTATION_COMPLETED'
  | 'STRUCTURE_CHANGED'
  | 'OVERFLOW_OR_UNDERFLOW'
  | 'ALGORITHM_COMPLETED'
  | 'ALGORITHM_ERROR'
  | 'IDLE'
  | 'TESTS_PASSED'
  | 'TESTS_FAILED'
  | 'SOLUTION_GENERATION_STARTED'
  | 'SOLUTION_GENERATION_FAILED'
  | 'SOLUTION_READY'
  | 'CHALLENGE_CORRECT'
  | 'CHALLENGE_WRONG';

export interface Reaction {
  event: AppEvent;
  mood: Mood;
  animation: MascotAnimation;
  line: string;
}

const OP_EVENT: Partial<Record<Operation, AppEvent>> = {
  COMPARE: 'COMPARE_ELEMENTS',
  FOUND: 'VALUE_FOUND',
  NOT_FOUND: 'VALUE_NOT_FOUND',
  POINTER_MOVE: 'POINTER_UPDATED',
  SWAP: 'SWAP_PERFORMED',
  ROTATE: 'TREE_ROTATION_COMPLETED',
  INSERT: 'STRUCTURE_CHANGED',
  DELETE: 'STRUCTURE_CHANGED',
  PUSH: 'STRUCTURE_CHANGED',
  POP: 'STRUCTURE_CHANGED',
  ENQUEUE: 'STRUCTURE_CHANGED',
  DEQUEUE: 'STRUCTURE_CHANGED',
  OVERFLOW: 'OVERFLOW_OR_UNDERFLOW',
  UNDERFLOW: 'OVERFLOW_OR_UNDERFLOW',
  ERROR: 'ALGORITHM_ERROR',
  DONE: 'ALGORITHM_COMPLETED',
};

export const REACTIONS: Record<AppEvent, Omit<Reaction, 'event'>> = {
  COMPARE_ELEMENTS: { mood: 'thinking', animation: 'think', line: 'Hmm, comparing these two…' },
  VALUE_FOUND: { mood: 'excited', animation: 'celebrate', line: 'Found it!' },
  VALUE_NOT_FOUND: { mood: 'sad', animation: 'confused', line: 'Not here — and that is a valid answer too.' },
  POINTER_UPDATED: { mood: 'neutral', animation: 'point', line: 'Pointer moved. Watch the arrow!' },
  SWAP_PERFORMED: { mood: 'surprised', animation: 'jump', line: 'Swap!' },
  TREE_ROTATION_COMPLETED: {
    mood: 'excited',
    animation: 'celebrate',
    line: 'Rotation done — balance restored.',
  },
  STRUCTURE_CHANGED: { mood: 'happy', animation: 'walk', line: 'The structure just changed.' },
  OVERFLOW_OR_UNDERFLOW: {
    mood: 'error',
    animation: 'error',
    line: 'Whoa — that operation is not allowed right now.',
  },
  ALGORITHM_COMPLETED: {
    mood: 'happy',
    animation: 'celebrate',
    line: 'All done! Replay or tweak the input.',
  },
  ALGORITHM_ERROR: { mood: 'error', animation: 'error', line: 'That input breaks a precondition.' },
  IDLE: { mood: 'happy', animation: 'idle', line: 'Press play or step through.' },
  TESTS_PASSED: {
    mood: 'excited',
    animation: 'celebrate',
    line: 'Every test passed on the execution service.',
  },
  TESTS_FAILED: {
    mood: 'thinking',
    animation: 'hint',
    line: 'Some tests failed. Compare expected and actual output.',
  },
  SOLUTION_GENERATION_STARTED: {
    mood: 'thinking',
    animation: 'loading',
    line: 'Working on candidate solutions…',
  },
  SOLUTION_GENERATION_FAILED: {
    mood: 'sad',
    animation: 'error',
    line: 'Generation failed. The details are below.',
  },
  SOLUTION_READY: { mood: 'happy', animation: 'wave', line: 'Candidates ready — please review them.' },
  CHALLENGE_CORRECT: { mood: 'excited', animation: 'celebrate', line: 'Correct!' },
  CHALLENGE_WRONG: { mood: 'thinking', animation: 'hint', line: 'Not quite — check the explanation.' },
};

export function reactionForEvent(event: AppEvent): Reaction {
  return { event, ...REACTIONS[event] };
}

export function reactionForStep(
  step: TraceStep | undefined,
  opts: { fast?: boolean; reducedMotion?: boolean } = {},
): Reaction {
  if (!step) return reactionForEvent('IDLE');
  const event: AppEvent = (step.done ? 'ALGORITHM_COMPLETED' : OP_EVENT[step.operation]) ?? 'IDLE';
  const r = reactionForEvent(event);
  const still = opts.fast || opts.reducedMotion;
  return { ...r, animation: still ? 'none' : r.animation, line: step.explanation };
}

export const CATEGORY_CHARACTER: Record<CategoryId, CharacterId> = {
  arrays: 'bit',
  searching: 'byte',
  sorting: 'loop',
  'linked-lists': 'node',
  stacks: 'bit',
  queues: 'bit',
  hashing: 'byte',
  trees: 'node',
  heaps: 'node',
  tries: 'node',
  graphs: 'node',
  recursion: 'loop',
  'dynamic-programming': 'pixel',
  patterns: 'pixel',
};
