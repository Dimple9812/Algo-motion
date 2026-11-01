import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineError } from '@/api/client';
import { useBackendStatus, useCreateSolution, useExtractText } from '@/api/hooks';
import { Mascot } from '@/components/mascot/Mascot';
import { reactionForEvent } from '@/components/mascot/reactions';
import { Button, Card, ErrorState } from '@/components/ui';

const MAX_UPLOAD = 5 * 1024 * 1024;
const ACCEPT = '.txt,.md,.pdf,.png,.jpg,.jpeg,.webp';

export default function Solve() {
  const [text, setText] = useState('');
  const [extracted, setExtracted] = useState<{ method: string; warnings: string[] } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const extract = useExtractText();
  const create = useCreateSolution();
  const status = useBackendStatus();
  const navigate = useNavigate();
  const offline = status.data === null;
  const reaction = reactionForEvent(
    create.isPending ? 'SOLUTION_GENERATION_STARTED' : create.error ? 'SOLUTION_GENERATION_FAILED' : 'IDLE',
  );

  const onFile = (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (f.size > MAX_UPLOAD) return setFileError('Files must be 5 MB or smaller.');
    if (!/\.(txt|md|pdf|png|jpe?g|webp)$/i.test(f.name))
      return setFileError('Unsupported file type. Use .txt, .md, .pdf, .png, .jpg or .webp.');
    if (/\.(txt|md)$/i.test(f.name)) {
      void f.text().then((t) => {
        setText(t.slice(0, 8000));
        setExtracted({
          method: 'plain text (read in your browser)',
          warnings: t.length > 8000 ? ['Truncated to 8000 characters.'] : [],
        });
      });
      return;
    }
    extract.mutate(f, {
      onSuccess: (r) => {
        setText(r.text);
        setExtracted({ method: r.method, warnings: r.warnings });
      },
      onError: (e) => setFileError(e.message),
    });
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header className="flex items-start gap-4">
        <Mascot character="pixel" mood={reaction.mood} animation={reaction.animation} size={84} />
        <div>
          <h1 className="font-display text-4xl font-extrabold">AI problem solver</h1>
          <p className="mt-1 text-ink-300">
            Paste or upload a coding question. Pixel proposes brute-force and optimized Java solutions, then
            the <strong>execution service</strong> compiles and tests them. Generated code is a candidate, not
            a guarantee.
          </p>
        </div>
      </header>
      {offline && (
        <ErrorState
          title="Backend not reachable"
          message="The AI solver runs on the backend (AI solution service + code execution sandbox). Start the stack with docker compose up, or explore the visualizer and problem library in the meantime."
        />
      )}
      {status.data && (
        <p className="text-xs text-ink-400">
          AI provider: <span className="font-mono">{status.data.aiProvider}</span>
          {status.data.aiProvider === 'fallback' &&
            ' — no external model configured; only built-in deterministic sample solutions for recognised classic problems are available.'}
        </p>
      )}
      <Card className="flex flex-col gap-3">
        <label htmlFor="problem-text" className="font-semibold">
          1. Problem statement
        </label>
        <textarea
          id="problem-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 8000))}
          rows={10}
          placeholder="e.g. Given an array of integers and a target, return the indices of two numbers that add up to the target…"
          className="rounded-xl border border-ink-600 bg-ink-850 p-3 font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="cursor-pointer rounded-lg border border-dashed border-ink-500 px-3 py-2 hover:bg-ink-800">
            📎 Upload .txt / .pdf / image
            <input
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
              aria-label="Upload a problem file"
            />
          </label>
          <span className="text-xs text-ink-400">
            Max 5 MB, PDFs up to 5 pages. Uploads are treated as untrusted text and never executed.
          </span>
        </div>
        {extract.isPending && <p className="text-sm text-ink-300">Extracting text…</p>}
        {fileError && (
          <p role="alert" className="text-sm text-rose-300">
            {fileError}
          </p>
        )}
        {extracted && (
          <p className="rounded-lg bg-sky-500/10 p-2 text-xs text-sky-100" role="status">
            Extracted via {extracted.method}. Please review and correct the text above before generating.
            {extracted.warnings.map((w) => ` ⚠ ${w}`)}
          </p>
        )}
        <span className="text-right text-xs text-ink-400">{text.length} / 8000</span>
      </Card>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          disabled={text.trim().length < 20 || create.isPending || offline}
          onClick={() => create.mutate(text, { onSuccess: (s) => navigate(`/solve/${s.id}`) })}
        >
          2. Generate solutions
        </Button>
        {text.trim().length < 20 && (
          <span className="text-xs text-ink-400">Enter at least 20 characters.</span>
        )}
      </div>
      {create.error && (
        <ErrorState
          message={
            create.error instanceof OfflineError ? 'The backend is not reachable.' : create.error.message
          }
        />
      )}
    </div>
  );
}
