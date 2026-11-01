import type { AlgoInput } from '@/algorithms/types';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface VisualizationLink {
  algorithm: string;
  input: AlgoInput;
}

export interface Approach {
  kind: 'BRUTE_FORCE' | 'OPTIMIZED';
  title: string;
  intuition: string;
  steps: string[];
  pseudocode: string[];
  java: string;
  time: string;
  space: string;
  correctness: string;
  limitations: string;
  visualization: VisualizationLink | null;
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface ProblemSummary {
  slug: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  patterns: string[];
  visualizationSupported: boolean;
}

export interface ProblemDetail extends ProblemSummary {
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  edgeCases: string[];
  hints: string[];
  approaches: Approach[];
  tests: TestCase[];
  related: string[];
  source: string;
  starterCode: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface Topic {
  id: string;
  name: string;
  count: number;
}

export type ExecutionStatus =
  'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPILATION_ERROR' | 'FAILED' | 'TIMEOUT' | 'REJECTED';

export interface TestResult {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  timeMs: number;
  error: string | null;
}

export interface Execution {
  id: string;
  status: ExecutionStatus;
  compileOutput: string | null;
  stderr: string | null;
  results: TestResult[];
  passed: number;
  total: number;
  runtimeMs: number | null;
  message: string | null;
  sandbox: string;
}

export type SolutionStatus = 'QUEUED' | 'GENERATING' | 'VALIDATING' | 'TESTING' | 'COMPLETED' | 'FAILED';

export type ApproachVerdict =
  'GENERATED' | 'SYNTAX_CHECKED' | 'TESTS_PASSED' | 'TESTS_FAILED' | 'MANUAL_REVIEW';

export interface GeneratedApproach {
  approachName: string;
  problemSummary: string;
  assumptions: string[];
  intuition: string;
  algorithmSteps: string[];
  pseudocode: string[];
  javaCode: string;
  timeComplexity: string;
  spaceComplexity: string;
  correctnessExplanation: string;
  edgeCases: string[];
  testCases: TestCase[];
  visualizationSupported: boolean;
  visualization: VisualizationLink | null;
  limitations: string[];
  verdict: ApproachVerdict;
  execution: Execution | null;
}

export interface SolutionSession {
  id: string;
  status: SolutionStatus;
  problemText: string;
  provider: string;
  topics: string[];
  ambiguities: string[];
  approaches: GeneratedApproach[];
  error: string | null;
  createdAt: string;
}

export interface SavedSession {
  id: string;
  type: 'VISUALIZATION' | 'SOLUTION';
  title: string;
  reference: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
