import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/api/client';
import { useSaveSession, useSolution } from '@/api/hooks';
import type { ApproachVerdict, GeneratedApproach } from '@/api/types';
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

const VERDICT: Record<
  ApproachVerdict,
  { label: string; tone: 'info' | 'success' | 'error' | 'warn' | 'neutral' }
> = {
  GENERATED: { label: 'Generated', tone: 'neutral' },
  SYNTAX_CHECKED: { label: 'Syntax checked', tone: 'info' },
  TESTS_PASSED: { label: 'Tests passed', tone: 'success' },
  TESTS_FAILED: { label: 'Tests failed', tone: 'error' },
  MANUAL_REVIEW: { label: 'Manual review recommended', tone: 'warn' },
};

const STEPS = ['QUEUED', 'GENERATING', 'VALIDATING', 'TESTING', 'COMPLETED'];

function ApproachPanel({ a }: { a: GeneratedApproach }) {
  const v = VERDICT[a.verdict];
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge tone={v.tone}>{v.label}</Badge>
        {a.visualizationSupported ? (
          <Badge tone="info">Visualization available</Badge>
        ) : (
          <Badge>Animation unavailable</Badge>
        )}
        <Badge tone="info">Time {a.timeComplexity}</Badge>
        <Badge tone="info">Space {a.spaceComplexity}</Badge>
      </div>
      <p>{a.intuition}</p>
      {a.assumptions.length > 0 && (
        <div>
          <h3 className="font-semibold">Assumptions</h3>
          <ul className="list-disc pl-5 text-ink-300">
            {a.assumptions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="font-semibold">Steps</h3>
        <ol className="list-decimal pl-5">
          {a.algorithmSteps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">Pseudocode</h3>
        <pre className="overflow-x-auto rounded-xl bg-ink-950 p-3 font-mono text-xs text-ink-300">
          {a.pseudocode.join('\n')}
        </pre>
      </div>
      <div>
        <h3 className="font-semibold">Java</h3>
        <pre className="max-h-96 overflow-auto rounded-xl bg-ink-950 p-3 font-mono text-xs">{a.javaCode}</pre>
      </div>
      <div>
        <h3 className="font-semibold">Correctness</h3>
        <p>{a.correctnessExplanation}</p>
      </div>
      {a.execution && (
        <div>
          <h3 className="font-semibold">Execution service results</h3>
          <p className="text-ink-300">
            {a.execution.status.toLowerCase()} · {a.execution.passed}/{a.execution.total} tests · sandbox{' '}
            {a.execution.sandbox}
          </p>
          {a.execution.compileOutput && (
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-rose-950/40 p-2 font-mono text-xs text-rose-200">
              {a.execution.compileOutput}
            </pre>
          )}
          <ul className="mt-1 font-mono text-xs">
            {a.execution.results.map((r) => (
              <li key={r.index}>
                {r.passed ? '✓' : '✕'} {r.input.replace(/\n/g, ' ⏎ ')} → expected {r.expected}, got {r.actual}
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.visualizationSupported && a.visualization ? (
        <div>
          <h3 className="font-semibold">Visualization (deterministic built-in adapter)</h3>
          <MiniPlayer algorithm={a.visualization.algorithm} input={a.visualization.input} />
        </div>
      ) : (
        <p className="rounded-lg bg-ink-850 p-2 text-xs text-ink-300">
          No supported trace adapter matched this approach, so no animation is shown. The explanation and code
          above are still available.
        </p>
      )}
      {a.limitations.length > 0 && (
        <div>
          <h3 className="font-semibold">Limitations</h3>
          <ul className="list-disc pl-5 text-ink-300">
            {a.limitations.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SolveResult() {
  const { id } = useParams();
  const { data, error, isLoading } = useSolution(id);
  const [tab, setTab] = useState('0');
  const user = useAuth((s) => s.user);
  const save = useSaveSession();
  const toast = useToasts((s) => s.push);
  if (isLoading) return <Spinner label="Loading session" />;
  if (error || !data) return <ErrorState message={(error as Error)?.message ?? 'Session not found'} />;
  const running = !['COMPLETED', 'FAILED'].includes(data.status);
  const passed = data.approaches.some((a) => a.verdict === 'TESTS_PASSED');
  const reaction = reactionForEvent(
    running
      ? 'SOLUTION_GENERATION_STARTED'
      : data.status === 'FAILED'
        ? 'SOLUTION_GENERATION_FAILED'
        : passed
          ? 'TESTS_PASSED'
          : data.approaches.some((a) => a.verdict === 'TESTS_FAILED')
            ? 'TESTS_FAILED'
            : 'SOLUTION_READY',
  );
  return (
    <div className="flex flex-col gap-4">
      <Link to="/solve" className="text-xs text-ink-300 hover:text-white">
        ← New question
      </Link>
      <header className="flex flex-wrap items-start gap-4">
        <Mascot
          character="pixel"
          mood={reaction.mood}
          animation={reaction.animation}
          size={80}
          speech={reaction.line}
        />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">Solution session</h1>
          <p className="text-xs text-ink-400">
            provider: {data.provider} · {new Date(data.createdAt).toLocaleString()}
          </p>
          <ol className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Job progress">
            {STEPS.map((s) => {
              const idx = STEPS.indexOf(data.status);
              const i = STEPS.indexOf(s);
              return (
                <li
                  key={s}
                  className={`rounded-full px-2 py-1 ${data.status === 'FAILED' ? 'bg-ink-800 text-ink-400' : i < idx || data.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-200' : i === idx ? 'bg-sky-500/20 text-sky-200' : 'bg-ink-800 text-ink-400'}`}
                  aria-current={i === idx ? 'step' : undefined}
                >
                  {s.toLowerCase()}
                </li>
              );
            })}
          </ol>
        </div>
        {user && data.status === 'COMPLETED' && (
          <Button
            size="sm"
            onClick={() =>
              save.mutate(
                {
                  type: 'SOLUTION',
                  title: data.problemText.slice(0, 60),
                  reference: data.id,
                  payload: { solutionId: data.id },
                },
                { onSuccess: () => toast('Saved to history', 'success') },
              )
            }
          >
            💾 Save session
          </Button>
        )}
      </header>
      <Card>
        <h2 className="text-sm font-semibold">Problem</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-ink-300">{data.problemText}</p>
        {data.topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.topics.map((t) => (
              <Badge key={t} tone="info">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {data.ambiguities.length > 0 && (
          <div className="mt-2 text-xs text-amber-200">Ambiguities: {data.ambiguities.join(' · ')}</div>
        )}
      </Card>
      {data.status === 'FAILED' && (
        <ErrorState title="Generation failed" message={data.error ?? 'Unknown error'} />
      )}
      {running && <Spinner label={`Status: ${data.status.toLowerCase()}…`} />}
      {data.approaches.length > 0 && (
        <Tabs value={tab} onChange={setTab}>
          <TabList label="Approaches">
            {data.approaches.map((a, i) => (
              <Tab key={i} value={String(i)}>
                {a.approachName}
              </Tab>
            ))}
          </TabList>
          {data.approaches.map((a, i) => (
            <TabPanel key={i} value={String(i)}>
              <Card className="mt-2">
                <ApproachPanel a={a} />
              </Card>
            </TabPanel>
          ))}
        </Tabs>
      )}
    </div>
  );
}
