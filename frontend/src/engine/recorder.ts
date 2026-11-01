import {
  TRACE_SCHEMA_VERSION,
  type Operation,
  type Trace,
  type TraceMetrics,
  type TraceStep,
  type VarValue,
  type VisualState,
} from './types';

/** Hard limit to keep traces bounded in memory and in the renderer. */
export const MAX_TRACE_STEPS = 4000;

export class TraceLimitError extends Error {
  constructor() {
    super(`Trace exceeded ${MAX_TRACE_STEPS} steps. Use a smaller input.`);
    this.name = 'TraceLimitError';
  }
}

/** Raised for invalid user input (e.g. unsorted array for binary search). */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Records snapshots while an algorithm runs. Algorithms mutate their own
 * working state and call `snap` at each meaningful operation; the recorder
 * deep-copies the visual state so later mutations never leak into earlier steps.
 */
export class TraceRecorder<S extends VisualState> {
  private readonly steps: TraceStep<S>[] = [];
  readonly metrics: TraceMetrics = { comparisons: 0, swaps: 0, writes: 0, reads: 0 };

  constructor(
    private readonly algorithm: string,
    private readonly input: Record<string, unknown>,
  ) {}

  snap(
    operation: Operation,
    explanation: string,
    state: S,
    opts: { line?: number | null; vars?: Record<string, VarValue> } = {},
  ): void {
    if (this.steps.length >= MAX_TRACE_STEPS) throw new TraceLimitError();
    switch (operation) {
      case 'COMPARE':
        this.metrics.comparisons++;
        break;
      case 'SWAP':
        this.metrics.swaps++;
        break;
      case 'WRITE':
      case 'SHIFT':
        this.metrics.writes++;
        break;
      case 'READ':
        this.metrics.reads++;
        break;
      default:
        break;
    }
    this.steps.push({
      step: this.steps.length,
      operation,
      explanation,
      line: opts.line ?? null,
      variables: clone(opts.vars ?? {}),
      state: clone(state),
      done: false,
    });
  }

  get length(): number {
    return this.steps.length;
  }

  finish(result: VarValue | undefined, explanation: string, state: S, line: number | null = null): Trace<S> {
    this.snap('DONE', explanation, state, { line, vars: result === undefined ? {} : { result } });
    const steps = this.steps.map((s, i) => ({ ...s, done: i === this.steps.length - 1 }));
    return {
      schemaVersion: TRACE_SCHEMA_VERSION,
      algorithm: this.algorithm,
      input: clone(this.input),
      steps,
      result,
      metrics: { ...this.metrics },
    };
  }
}
