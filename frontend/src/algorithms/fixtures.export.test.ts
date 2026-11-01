import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getAlgorithm } from './registry';

/**
 * Conformance fixtures shared with the Java algorithm-visualization-service.
 * Regenerate with: EXPORT_FIXTURES=1 npx vitest run src/algorithms/fixtures.export.test.ts
 */
export const FIXTURES: { algorithm: string; input: Record<string, unknown> }[] = [
  { algorithm: 'linear-search', input: { values: [4, 8, 12, 16, 23, 42], target: 16 } },
  { algorithm: 'linear-search', input: { values: [4, 8], target: 5 } },
  { algorithm: 'binary-search', input: { values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 } },
  { algorithm: 'binary-search', input: { values: [1, 3, 5], target: 4 } },
  { algorithm: 'bubble-sort', input: { values: [5, 1, 4, 2, 8, 3] } },
  { algorithm: 'bubble-sort', input: { values: [1, 2, 3] } },
  { algorithm: 'insertion-sort', input: { values: [12, 11, 13, 5, 6] } },
  { algorithm: 'merge-sort', input: { values: [38, 27, 43, 3, 9, 82, 10] } },
  { algorithm: 'quick-sort', input: { values: [10, 80, 30, 90, 40, 50, 70] } },
  { algorithm: 'quick-sort', input: { values: [3, 3, 1, 2] } },
];

describe('trace fixtures', () => {
  it('can be produced for every fixture', () => {
    const out = FIXTURES.map((f) => {
      const t = getAlgorithm(f.algorithm)!.run(f.input as never);
      return {
        algorithm: f.algorithm,
        input: f.input,
        result: t.result,
        steps: t.steps.map((s) => ({
          operation: s.operation,
          line: s.line,
          values: s.state.kind === 'array' ? s.state.values : null,
        })),
      };
    });
    expect(out).toHaveLength(FIXTURES.length);
    if (process.env.EXPORT_FIXTURES)
      writeFileSync('../content/trace-fixtures.json', JSON.stringify(out, null, 1));
  });
});
