import { MAX_TRACE_STEPS } from './recorder';
import { OPERATIONS, TRACE_SCHEMA_VERSION, type Trace, type VisualKind } from './types';

const KINDS: VisualKind[] = [
  'array',
  'linkedList',
  'stack',
  'queue',
  'hash',
  'tree',
  'graph',
  'grid',
  'recursion',
];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Structural validation of a trace that may come from an untrusted source
 * (backend API, saved session, AI pipeline). Traces are pure data: we never
 * evaluate strings from a trace, and anything unexpected is rejected.
 */
export function validateTrace(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) return { ok: false, errors: ['Trace must be an object'] };
  const t = raw as Partial<Trace>;
  if (t.schemaVersion !== TRACE_SCHEMA_VERSION)
    errors.push(`Unsupported schemaVersion: ${String(t.schemaVersion)}`);
  if (typeof t.algorithm !== 'string' || !/^[a-z0-9-]{1,64}$/.test(t.algorithm))
    errors.push('Invalid algorithm id');
  if (!Array.isArray(t.steps) || t.steps.length === 0) {
    errors.push('Trace must contain at least one step');
    return { ok: false, errors };
  }
  if (t.steps.length > MAX_TRACE_STEPS) errors.push(`Trace has more than ${MAX_TRACE_STEPS} steps`);
  let kind: string | null = null;
  t.steps.forEach((s, i) => {
    if (!isObject(s)) {
      errors.push(`Step ${i} is not an object`);
      return;
    }
    if (s.step !== i) errors.push(`Step ${i} has index ${String(s.step)}`);
    if (!OPERATIONS.includes(s.operation))
      errors.push(`Step ${i} has unknown operation ${String(s.operation)}`);
    if (typeof s.explanation !== 'string' || s.explanation.length > 500)
      errors.push(`Step ${i} explanation invalid`);
    if (s.line !== null && (typeof s.line !== 'number' || s.line < 1)) errors.push(`Step ${i} line invalid`);
    if (!isObject(s.variables)) errors.push(`Step ${i} variables invalid`);
    if (!isObject(s.state) || !KINDS.includes((s.state as { kind: VisualKind }).kind)) {
      errors.push(`Step ${i} has invalid visual state`);
    } else {
      const k = (s.state as { kind: string }).kind;
      if (kind === null) kind = k;
      else if (kind !== k) errors.push(`Step ${i} changes visual kind from ${kind} to ${k}`);
    }
    if (s.done !== (i === t.steps!.length - 1)) errors.push(`Step ${i} has inconsistent done flag`);
  });
  return { ok: errors.length === 0, errors: errors.slice(0, 20) };
}

export function assertValidTrace(raw: unknown): asserts raw is Trace {
  const res = validateTrace(raw);
  if (!res.ok) throw new Error(`Invalid trace: ${res.errors.join('; ')}`);
}
