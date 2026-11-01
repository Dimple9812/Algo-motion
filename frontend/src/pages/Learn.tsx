import { Link } from 'react-router-dom';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { usePrefs } from '@/store/prefs';
import { CHALLENGES, LEARNING_PATHS } from './learnData';

export default function Learn() {
  const events = useProgress((s) => s.events);
  const done = new Set(events.map((e) => e.key));
  const playful = usePrefs((s) => s.mode) === 'playful';
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold">Learn</h1>
          <p className="mt-1 text-ink-300">
            Guided paths through the AlgoVerse plus mini-challenges checked against real execution traces.
          </p>
        </div>
        {playful && (
          <Mascot
            character="pixel"
            mood="happy"
            animation="hint"
            size={72}
            speech="Paths are suggestions, not chores — skip around freely."
          />
        )}
      </header>
      <section aria-labelledby="paths">
        <h2 id="paths" className="font-display text-2xl font-bold">
          Learning paths
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {LEARNING_PATHS.map((p) => (
            <Card key={p.id}>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-ink-300">{p.description}</p>
              <ol className="mt-3 flex flex-col gap-1">
                {p.steps.map((s, i) => {
                  const challengeId = s.to.startsWith('/learn/challenges/') ? s.to.split('/').pop() : null;
                  const algoId = new URLSearchParams(s.to.split('?')[1] ?? '').get('algo');
                  const complete =
                    (challengeId && done.has(`challenge:${challengeId}`)) ||
                    (algoId && done.has(`viz:${algoId}`));
                  return (
                    <li key={s.to}>
                      <Link
                        to={s.to}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-800"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-400 text-ink-950' : 'bg-ink-700 text-ink-300'}`}
                          aria-label={complete ? 'completed' : `step ${i + 1}`}
                        >
                          {complete ? '✓' : i + 1}
                        </span>
                        {s.label}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Card>
          ))}
        </div>
      </section>
      <section aria-labelledby="challenges">
        <h2 id="challenges" className="font-display text-2xl font-bold">
          Mini-challenges
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHALLENGES.map((c) => (
            <Link
              key={c.id}
              to={`/learn/challenges/${c.id}`}
              className="rounded-2xl border border-ink-700 bg-ink-900 p-4 hover:border-ink-500"
              data-testid={`challenge-${c.id}`}
            >
              <div className="flex items-center justify-between">
                <Mascot character={c.character} mood="happy" animation="none" size={44} />
                {done.has(`challenge:${c.id}`) && (
                  <span className="text-xs font-semibold text-emerald-300">✓ completed</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-300">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
