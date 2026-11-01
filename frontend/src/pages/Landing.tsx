import { Link } from 'react-router-dom';
import { CATEGORIES, ALGORITHMS } from '@/algorithms/registry';
import { BUNDLED_PROBLEM_COUNT } from '@/api/hooks';
import { CREW, Mascot, type CharacterId } from '@/components/mascot/Mascot';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { Button, Card } from '@/components/ui';
import { LEARNING_PATHS } from './learnData';

export function Landing() {
  return (
    <div className="flex flex-col gap-20 pb-10">
      <section className="grid items-center gap-10 pt-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <span className="w-fit rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
            {ALGORITHMS.length} traced algorithms · {BUNDLED_PROBLEM_COUNT} interview problems
          </span>
          <h1 className="font-display text-5xl leading-[1.05] font-extrabold md:text-6xl">
            Algorithms aren’t magic.
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
              Watch them work.
            </span>
          </h1>
          <p className="max-w-xl text-lg text-ink-300">
            Explore data structures, animate algorithms, and turn coding interview questions into interactive
            adventures.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/visualizer">
              <Button variant="primary" size="lg">
                Explore the AlgoVerse
              </Button>
            </Link>
            <Link to="/problems">
              <Button size="lg">Practice Coding Problems</Button>
            </Link>
            <Link to="/solve">
              <Button size="lg" variant="ghost">
                Ask the AI Tutor →
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-14 -left-4 z-10">
            <Mascot
              character="byte"
              mood="happy"
              animation="wave"
              size={110}
              speech="Hi, I’m Byte! Press play — every frame below is a real step of binary search."
            />
          </div>
          <Card className="mt-16 pt-6">
            <MiniPlayer algorithm="binary-search" label="Binary search demo" />
          </Card>
        </div>
      </section>

      <section aria-labelledby="crew-h">
        <h2 id="crew-h" className="font-display text-3xl font-bold">
          Meet the AlgoMotion Crew
        </h2>
        <p className="mt-1 text-ink-300">
          Original characters who react to what the algorithm actually does — never the other way round.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(CREW) as CharacterId[]).map((id, i) => (
            <Card key={id} className="flex flex-col items-center gap-2 text-center">
              <Mascot character={id} mood={i % 2 ? 'happy' : 'excited'} animation="idle" size={88} />
              <p className="font-display text-lg font-bold" style={{ color: CREW[id].color }}>
                {CREW[id].name}
              </p>
              <p className="text-xs font-semibold tracking-wide text-ink-300 uppercase">{CREW[id].role}</p>
              <p className="text-sm text-ink-300">{CREW[id].bio}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="features-h" className="grid gap-4 md:grid-cols-3">
        <h2 id="features-h" className="sr-only">
          Features
        </h2>
        {[
          [
            '🎞️',
            'Deterministic traces',
            'Every animation is replayed from a recorded execution trace: seek to any step and you see exactly that state.',
          ],
          [
            '🧑‍💻',
            'Interview workspace',
            'Brute-force vs optimized Java solutions, Monaco editor and sandboxed test runs.',
          ],
          [
            '🤖',
            'Honest AI solver',
            'Candidate solutions are labeled Generated → Syntax checked → Tests passed. Nothing is presented as verified until it is.',
          ],
          [
            '🎮',
            'Playful or technical',
            'Toggle between themed worlds with characters and clean technical diagrams — same trace, same data.',
          ],
          [
            '🏅',
            'Learning XP',
            'Badges for real milestones. XP is awarded once per achievement — no grinding, no streak pressure.',
          ],
          [
            '♿',
            'Accessible',
            'Keyboard playback, ARIA labels, state never shown by colour alone, reduced-motion support.',
          ],
        ].map(([icon, t, d]) => (
          <Card key={t}>
            <p className="text-2xl" aria-hidden>
              {icon}
            </p>
            <h3 className="mt-2 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-ink-300">{d}</p>
          </Card>
        ))}
      </section>

      <section aria-labelledby="worlds-h">
        <h2 id="worlds-h" className="font-display text-3xl font-bold">
          Supported data structures & algorithms
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to={`/visualizer/${c.id}`}
              className="group rounded-2xl border border-ink-700 bg-ink-900/70 p-4 transition-colors hover:border-ink-500"
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
                {c.world}
              </p>
              <p className="mt-1 font-semibold">{c.name}</p>
              <p className="mt-1 text-xs text-ink-300">
                {ALGORITHMS.filter((a) => a.category === c.id)
                  .map((a) => a.name)
                  .slice(0, 4)
                  .join(' · ')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="paths-h">
        <h2 id="paths-h" className="font-display text-3xl font-bold">
          Learning paths
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {LEARNING_PATHS.slice(0, 3).map((p) => (
            <Card key={p.id}>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm text-ink-300">{p.description}</p>
              <p className="mt-2 text-xs text-ink-400">{p.steps.length} steps</p>
              <Link to="/learn" className="mt-3 inline-block text-sm font-semibold text-sky-300">
                Start path →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="tech-h">
        <h2 id="tech-h" className="font-display text-3xl font-bold">
          Under the hood
        </h2>
        <p className="mt-2 max-w-3xl text-ink-300">
          React + TypeScript + Vite frontend with a trace-driven animation engine; Java 21 / Spring Boot
          microservices behind an API gateway; PostgreSQL with Flyway, Redis rate limiting, Kafka for
          asynchronous solution and code-execution jobs, and an isolated Docker sandbox for running Java.
        </p>
        <Link to="/about" className="mt-3 inline-block font-semibold text-sky-300">
          Read the architecture →
        </Link>
      </section>
    </div>
  );
}
