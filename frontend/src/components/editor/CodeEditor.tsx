import { lazy, Suspense } from 'react';
import { Spinner } from '../ui';

const MonacoEditor = lazy(() => import('./MonacoEditor'));

export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  height?: number | string;
  label: string;
}

/** Lazy-loaded Monaco editor for Java. Monaco is bundled locally (no CDN). */
export function CodeEditor(props: CodeEditorProps) {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center rounded-xl border border-ink-700 bg-ink-950"
          style={{ height: props.height ?? 360 }}
        >
          <Spinner label="Loading editor" />
        </div>
      }
    >
      <MonacoEditor {...props} />
    </Suspense>
  );
}
