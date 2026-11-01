import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { recordProgress, useExecution, useProblem, useSubmitExecution } from '@/api/hooks';
import type { Approach, Execution, ProblemDetail as Problem } from '@/api/types';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Mascot } from '@/components/mascot/Mascot';
import { reactionForEvent } from '@/components/mascot/reactions';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  useToasts,
} from '@/components/ui';
import { useProgress } from '@/store/progress';
import { usePrefs } from '@/store/prefs';
import { NotFound } from './NotFound';
import { difficultyTone, topicName } from './Problems';

function ApproachView({ a }: { a: Approach }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-bold">{a.title}</h2>
      <div className="flex flex-wrap gap-2">
        <Badge tone="info">Time {a.time}</Badge>
        <Badge tone="info">Space {a.space}</Badge>
      </div>
      <section>
        <h3 className="font-semibold">Intuition</h3>
        <p className="mt-1 text-sm text-slate-200">{a.intuition}</p>
      </section>
      <section>
        <h3 className="font-semibold">Algorithm</h3>
        <ol className="mt-1 list-decimal pl-5 text-sm text-slate-200">
          {a.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="font-semibold">Pseudocode</h3>
        <pre className="mt-1 overflow-x-auto rounded-xl bg-ink-950 p-3 font-mono text-[13px] text-ink-300">
          {a.pseudocode.join('\n')}
        </pre>
      </section>
      <section>
        <h3 className="font-semibold">Java</h3>
        <pre className="mt-1 max-h-96 overflow-auto rounded-xl bg-ink-950 p-3 font-mono text-[12.5px] text-slate-200">
          {a.java}
        </pre>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Why it is correct</h3>
          <p className="mt-1 text-sm text-slate-200">{a.correctness}</p>
        </div>
        <div>
          <h3 className="font-semibold">Limitations</h3>
          <p className="mt-1 text-sm text-slate-200">{a.limitations}</p>
        </div>
      </section>
    </div>
  );
}

function Results({ exec }: { exec: Execution }) {
  const pending = exec.status === 'QUEUED' || exec.status === 'RUNNING';
  return (
    <div className="flex flex-col gap-3" data-testid="execution-results">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            exec.status === 'COMPLETED' && exec.passed === exec.total ? 'success' : pending ? 'info' : 'error'
          }
        >
          {exec.status.replace('_', ' ').toLowerCase()}
        </Badge>
        {!pending && (
          <span className="text-sm">
            {exec.passed} / {exec.total} tests passed
          </span>
        )}
        {exec.runtimeMs !== null && <span className="text-xs text-ink-400">{exec.runtimeMs} ms total</span>}
        <span className="text-xs text-ink-400">sandbox: {exec.sandbox}</span>
      </div>
      {pending && <Spinner label="Running in the sandbox" />}
      {exec.message && <p className="text-sm text-ink-300">{exec.message}</p>}
      {exec.compileOutput && (
        <pre className="max-h-48 overflow-auto rounded-xl bg-rose-950/40 p-3 font-mono text-xs text-rose-200">
          {exec.compileOutput}
        </pre>
      )}
      {exec.results.map((r) => (
        <details
          key={r.index}
          className={`rounded-xl border p-3 text-sm ${r.passed ? 'border-emerald-500/30' : 'border-rose-500/40'}`}
          open={!r.passed}
        >
          <summary className="cursor-pointer">
            {r.passed ? '✓' : '✕'} Test {r.index + 1}{' '}
            <span className="text-xs text-ink-400">({r.timeMs} ms)</span>
          </summary>
          <div className="mt-2 grid gap-2 font-mono text-xs md:grid-cols-3">
            <div>
              <p className="text-ink-400">input</p>
              <pre className="whitespace-pre-wrap">{r.input}</pre>
            </div>
            <div>
              <p className="text-ink-400">expected</p>
              <pre className="whitespace-pre-wrap">{r.expected}</pre>
            </div>
            <div>
              <p className="text-ink-400">actual</p>
              <pre className="whitespace-pre-wrap">{r.actual}</pre>
            </div>
          </div>
          {r.error && <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-300">{r.error}</pre>}
        </details>
      ))}
    </div>
  );
}

function Workspace({ p, offline }: { p: Problem; offline: boolean }) {
  const [code, setCode] = useState(p.starterCode);
  const [execId, setExecId] = useState<string | null>(null);
  const submit = useSubmitExecution();
  const exec = useExecution(execId);
  const award = useProgress((s) => s.award);
  const toast = useToasts((s) => s.push);
  const playful = usePrefs((s) => s.mode) === 'playful';
  useEffect(() => setCode(p.starterCode), [p.starterCode]);
  const done = exec.data && !['QUEUED', 'RUNNING'].includes(exec.data.status);
  const allPassed =
    done &&
    exec.data!.status === 'COMPLETED' &&
    exec.data!.passed === exec.data!.total &&
    exec.data!.total > 0;
  useEffect(() => {
    if (!allPassed) return;
    const ev = award(`problem:${p.slug}`, 'problem', p.topic);
    if (ev) {
      recordProgress(ev);
      toast(`+${ev.xp} XP — ${p.title} solved`, 'success');
    }
  }, [allPassed, award, p, toast]);
  const reaction = !done ? null : reactionForEvent(allPassed ? 'TESTS_PASSED' : 'TESTS_FAILED');
  return (
    <div className="flex flex-col gap-3">
      <CodeEditor value={code} onChange={setCode} label={`Java editor for ${p.title}`} height={420} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={
            offline || submit.isPending || (exec.data && ['QUEUED', 'RUNNING'].includes(exec.data.status))
          }
          onClick={() =>
            submit.mutate({ sourceCode: code, problemSlug: p.slug }, { onSuccess: (r) => setExecId(r.id) })
          }
        >
          ▶ Run tests
        </Button>
        <Button variant="ghost" onClick={() => setCode(p.starterCode)}>
          Reset code
        </Button>
        <Button
          variant="ghost"
          onClick={() => setCode(p.approaches.find((a) => a.kind === 'OPTIMIZED')?.java ?? p.starterCode)}
        >
          Load reference solution
        </Button>
        {offline && (
          <span className="text-xs text-amber-200">Code execution needs the backend and its sandbox.</span>
        )}
      </div>
      {submit.error && (
        <ErrorState
          message={
            submit.error instanceof ApiError && submit.error.status === 429
              ? 'Too many runs — please wait a moment.'
              : submit.error.message
          }
        />
      )}
      {exec.data && (
        <Card>
          <div className="flex items-start gap-3">
            {playful && reaction && (
              <Mascot
                character="pixel"
                mood={reaction.mood}
                animation={reaction.animation}
                size={56}
                speech={reaction.line}
              />
            )}
            <div className="flex-1">
              <Results exec={exec.data} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function ProblemDetail() {
  const { slug = '' } = useParams();
  const { data: p, isLoading, error } = useProblem(slug);
  const [tab, setTab] = useState('description');
  const [vizApproach, setVizApproach] = useState<'BRUTE_FORCE' | 'OPTIMIZED'>('OPTIMIZED');
  if (isLoading) return <Spinner label="Loading problem" />;
  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error || !p) return <ErrorState message={(error as Error)?.message ?? 'Unknown error'} />;
  const brute = p.approaches.find((a) => a.kind === 'BRUTE_FORCE');
  const opt = p.approaches.find((a) => a.kind === 'OPTIMIZED');
  const viz = p.approaches.find((a) => a.kind === vizApproach)?.visualization ?? null;
  return (
    <div className="flex flex-col gap-4">
      <Link to="/problems" className="text-xs text-ink-300 hover:text-white">
        ← All problems
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">{p.title}</h1>
        <Badge tone={difficultyTone(p.difficulty)}>{p.difficulty.toLowerCase()}</Badge>
        <Badge>{topicName(p.topic)}</Badge>
        {p.patterns.map((x) => (
          <Badge key={x} tone="info">
            {x}
          </Badge>
        ))}
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        <Tabs value={tab} onChange={setTab} className="flex min-w-0 flex-col gap-2">
          <TabList label="Problem sections">
            <Tab value="description">Description</Tab>
            <Tab value="hints">Hints</Tab>
            {brute && <Tab value="brute">Brute force</Tab>}
            {opt && <Tab value="optimized">Optimized</Tab>}
            <Tab value="visual">Visualization</Tab>
          </TabList>
          <Card className="min-h-[420px]">
            <TabPanel value="description">
              <div className="flex flex-col gap-4 text-sm leading-relaxed">
                <p className="whitespace-pre-line text-[15px] text-slate-100">{p.statement}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Input</h3>
                    <p className="whitespace-pre-line text-ink-300">{p.inputFormat}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Output</h3>
                    <p className="whitespace-pre-line text-ink-300">{p.outputFormat}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Examples</h3>
                  {p.examples.map((e, i) => (
                    <div key={i} className="mt-2 rounded-xl bg-ink-950 p-3 font-mono text-xs">
                      <p className="text-ink-400">input</p>
                      <pre className="whitespace-pre-wrap">{e.input}</pre>
                      <p className="mt-1 text-ink-400">output</p>
                      <pre className="whitespace-pre-wrap">{e.output}</pre>
                      {e.explanation && <p className="mt-1 font-sans text-ink-300">{e.explanation}</p>}
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold">Constraints</h3>
                  <ul className="list-disc pl-5 text-ink-300">
                    {p.constraints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Edge cases to consider</h3>
                  <ul className="list-disc pl-5 text-ink-300">
                    {p.edgeCases.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                {p.related.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Related</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {p.related.map((r) => (
                        <Link key={r} to={`/problems/${r}`} className="text-sky-300 underline">
                          {r}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-ink-400">Source: {p.source}</p>
              </div>
            </TabPanel>
            <TabPanel value="hints">
              <ol className="flex flex-col gap-2">
                {p.hints.map((h, i) => (
                  <li key={i}>
                    <details className="rounded-xl bg-ink-850 p-3 text-sm">
                      <summary className="cursor-pointer font-semibold">Hint {i + 1}</summary>
                      <p className="mt-2">{h}</p>
                    </details>
                  </li>
                ))}
              </ol>
            </TabPanel>
            {brute && (
              <TabPanel value="brute">
                <ApproachView a={brute} />
              </TabPanel>
            )}
            {opt && (
              <TabPanel value="optimized">
                <ApproachView a={opt} />
              </TabPanel>
            )}
            <TabPanel value="visual">
              {p.visualizationSupported ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2" role="group" aria-label="Approach to visualize">
                    {brute?.visualization && (
                      <Button
                        size="sm"
                        aria-pressed={vizApproach === 'BRUTE_FORCE'}
                        variant={vizApproach === 'BRUTE_FORCE' ? 'primary' : 'secondary'}
                        onClick={() => setVizApproach('BRUTE_FORCE')}
                      >
                        Brute force
                      </Button>
                    )}
                    {opt?.visualization && (
                      <Button
                        size="sm"
                        aria-pressed={vizApproach === 'OPTIMIZED'}
                        variant={vizApproach === 'OPTIMIZED' ? 'primary' : 'secondary'}
                        onClick={() => setVizApproach('OPTIMIZED')}
                      >
                        Optimized
                      </Button>
                    )}
                  </div>
                  {viz ? (
                    <MiniPlayer key={vizApproach} algorithm={viz.algorithm} input={viz.input} />
                  ) : (
                    <p className="text-sm text-ink-300">No trace adapter for this approach yet.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-300">
                  Animation is not available for this problem yet — the explanation and code are still
                  complete.
                </p>
              )}
            </TabPanel>
          </Card>
        </Tabs>
        <Workspace p={p} offline={p.offline} />
      </div>
    </div>
  );
}
