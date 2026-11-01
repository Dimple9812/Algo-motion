import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/java/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import type { CodeEditorProps } from './CodeEditor';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

export default function MonacoEditor({ value, onChange, readOnly, height = 360, label }: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700" aria-label={label}>
      <Editor
        height={height}
        language="java"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          tabSize: 4,
          automaticLayout: true,
          ariaLabel: label,
        }}
      />
    </div>
  );
}
