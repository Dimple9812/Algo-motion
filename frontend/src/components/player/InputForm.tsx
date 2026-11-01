import { useEffect, useState } from 'react';
import type { AlgoInput, AlgorithmDef, InputField } from '@/algorithms/types';
import { Button, Field, inputClass } from '../ui';

function toText(f: InputField, v: AlgoInput[string] | undefined): string {
  if (v === undefined) return '';
  if (Array.isArray(v)) return v.join(f.type === 'words' ? ', ' : ', ');
  return String(v);
}

export function parseField(f: InputField, raw: string): AlgoInput[string] {
  switch (f.type) {
    case 'numbers':
      return raw
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((x) => (/^-?\d+$/.test(x) ? Number(x) : NaN));
    case 'number':
      return raw.trim() === '' ? NaN : Number(raw);
    case 'words':
      return raw.split(/[\s,]+/).filter(Boolean);
    default:
      return raw;
  }
}

interface Props {
  algo: AlgorithmDef;
  value: AlgoInput;
  onSubmit: (input: AlgoInput) => void;
  error: string | null;
}

/** Edits algorithm input. Submitting regenerates the trace; invalid input never reaches the renderer. */
export function InputForm({ algo, value, onSubmit, error }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState(1);
  useEffect(() => {
    setDraft(Object.fromEntries(algo.inputs.map((f) => [f.key, toText(f, value[f.key])])));
  }, [algo, value]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed: AlgoInput = {};
    for (const f of algo.inputs) parsed[f.key] = parseField(f, draft[f.key] ?? '');
    onSubmit(parsed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label={`${algo.name} input`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {algo.inputs.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            hint={f.type === 'numbers' ? 'Comma-separated whole numbers' : undefined}
          >
            {f.type === 'select' ? (
              <select
                className={inputClass}
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass + ' font-mono'}
                name={f.key}
                value={draft[f.key] ?? ''}
                inputMode={f.type === 'number' || f.type === 'numbers' ? 'numeric' : 'text'}
                maxLength={
                  'maxLength' in f && f.maxLength && f.type !== 'numbers' && f.type !== 'words'
                    ? f.maxLength
                    : 300
                }
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            )}
          </Field>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          data-testid="input-error"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm">
          Run with this input
        </Button>
        {algo.randomInput && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const next = seed + 1;
              setSeed(next);
              onSubmit(algo.randomInput!(next * 7919));
            }}
          >
            🎲 Random input
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => onSubmit(algo.defaultInput)}>
          Default
        </Button>
      </div>
    </form>
  );
}
