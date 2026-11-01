import { useBackendStatus } from '@/api/hooks';
import { Badge, Card } from '@/components/ui';

const SERVICES = [
  ['api-gateway', 'Routing, correlation IDs, CORS, rate limiting (Redis), consistent error envelopes.'],
  [
    'user-progress-service',
    'Accounts (BCrypt + JWT, httpOnly refresh cookie), preferences, bookmarks, saved sessions, idempotent XP events, achievements.',
  ],
  [
    'algorithm-visualization-service',
    'Java implementations of core algorithms that emit the same versioned trace schema the frontend replays; trace validation.',
  ],
  [
    'problem-catalog-service',
    'Problem statements, topics, difficulty, hints, reference solutions and hidden tests. Search + pagination.',
  ],
  [
    'ai-solution-service',
    'Provider-independent LLM layer with deterministic fallback, upload text extraction, structured-output validation, async jobs via Kafka.',
  ],
  [
    'code-execution-service',
    'Consumes execution jobs, compiles and runs Java in a throwaway Docker container (no network, read-only FS, CPU/memory/pids limits, non-root).',
  ],
];

export default function About() {
  const status = useBackendStatus();
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl font-extrabold">How AlgoMotion works</h1>
        <p className="mt-2 text-ink-300">
          A trace-driven animation engine on the frontend, and a set of Spring Boot services that own distinct
          data and workflows.
        </p>
      </header>
      <section aria-labelledby="pipeline">
        <h2 id="pipeline" className="font-display text-2xl font-bold">
          The trace pipeline
        </h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-6">
          {[
            'Algorithm implementation',
            'Structured trace (schema v1.0)',
            'Trace validation',
            'Deterministic player (seek = index)',
            'Renderer (playful / technical)',
            'Character reaction (read-only)',
          ].map((s, i) => (
            <li key={s} className="flex items-center gap-2 md:flex-col md:items-stretch">
              <Card className="flex-1 text-center text-sm">
                <span className="block text-xs text-ink-400">{i + 1}</span>
                {s}
              </Card>
              {i < 5 && (
                <span className="text-ink-400 md:hidden" aria-hidden>
                  ↓
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-ink-300">
          Each step stores a full snapshot of the visual state, so seeking, pausing and restarting can never
          drift from the real execution. Animation timers only decide <em>when</em> to show the next snapshot
          — never what it contains. Mascots read the current step and never feed anything back.
        </p>
      </section>
      <section aria-labelledby="services">
        <h2 id="services" className="font-display text-2xl font-bold">
          Services
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SERVICES.map(([name, d]) => (
            <Card key={name}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold">{name}</p>
                {status.data?.services?.[name] && (
                  <Badge tone={status.data.services[name] === 'UP' ? 'success' : 'error'}>
                    {status.data.services[name]}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-300">{d}</p>
            </Card>
          ))}
        </div>
        {status.data === null && (
          <p className="mt-3 text-sm text-amber-200">
            Backend status: not reachable from this page (frontend-only deployment or services stopped).
          </p>
        )}
      </section>
      <section aria-labelledby="async">
        <h2 id="async" className="font-display text-2xl font-bold">
          Asynchronous workflows
        </h2>
        <p className="mt-2 text-sm text-ink-300">
          Solution generation and code execution are long-running, so they are jobs: the API stores a job row
          and an outbox event in one transaction, a relay publishes to Kafka (<code>solution.requested</code>,{' '}
          <code>execution.requested</code>), idempotent consumers process them, and the browser polls job
          status. Completion events (<code>execution.completed</code>) update solution verdicts. Failed
          messages are retried and then routed to a dead-letter topic.
        </p>
      </section>
      <section aria-labelledby="honesty">
        <h2 id="honesty" className="font-display text-2xl font-bold">
          Honesty rules
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-300">
          <li>
            AI output is labelled Generated → Syntax checked → Tests passed / failed; nothing is “verified”
            until the execution service says so.
          </li>
          <li>
            AI never produces rendering code. Animations only come from built-in deterministic adapters;
            otherwise the UI says animation is unavailable.
          </li>
          <li>Challenge answers are computed from the trace, never from a model.</li>
          <li>Operation counts come from traces; animation time is not presented as runtime.</li>
        </ul>
      </section>
    </div>
  );
}
