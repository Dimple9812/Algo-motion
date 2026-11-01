import type { Trace, VisualKind } from '@/engine/types';

export type CategoryId =
  | 'arrays'
  | 'searching'
  | 'sorting'
  | 'linked-lists'
  | 'stacks'
  | 'queues'
  | 'hashing'
  | 'trees'
  | 'heaps'
  | 'tries'
  | 'graphs'
  | 'recursion'
  | 'dynamic-programming'
  | 'patterns';

export type InputField =
  | { key: string; label: string; type: 'numbers'; min?: number; max?: number; maxLength?: number }
  | { key: string; label: string; type: 'number'; min?: number; max?: number }
  | { key: string; label: string; type: 'text'; maxLength?: number; pattern?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'words'; maxLength?: number };

export type InputValue = number | string | number[] | string[];
export type AlgoInput = Record<string, InputValue>;

export interface Complexity {
  time: { best: string; average: string; worst: string };
  space: string;
  stable?: boolean;
  inPlace?: boolean;
}

export interface AlgorithmDef {
  id: string;
  name: string;
  category: CategoryId;
  visual: VisualKind;
  summary: string;
  pseudocode: string[];
  complexity: Complexity;
  /** documented preconditions / assumptions, shown in the UI */
  assumptions?: string[];
  inputs: InputField[];
  defaultInput: AlgoInput;
  randomInput?: (seed: number) => AlgoInput;
  run: (input: AlgoInput) => Trace;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  world: string;
  character: 'byte' | 'bit' | 'loop' | 'node' | 'pixel';
  blurb: string;
  accent: string;
}
