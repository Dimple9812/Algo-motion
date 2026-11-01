import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { recordProgress } from '@/api/hooks';
import { Mascot } from '@/components/mascot/Mascot';
import { reactionForEvent } from '@/components/mascot/reactions';
import { Renderer } from '@/components/viz/Renderer';
import { Button, Card, inputClass, useToasts } from '@/components/ui';
import { usePrefs } from '@/store/prefs';
import { useProgress } from '@/store/progress';
import { NotFound } from './NotFound';
import { CHALLENGES, buildChallenge } from './learnData';

export default function ChallengePage() {
  const { id } = useParams();
  const def = CHALLENGES.find((c) => c.id === id);
  const [seed, setSeed] = useState(1);
  const built = useMemo(() => (def ? buildChallenge(def, seed) : null), [def, seed]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const playful = usePrefs((s) => s.mode) === 'playful';
  const award = useProgress((s) => s.award);
  const toast = useToasts((s) => s.push);
  if (!def || !built) return <NotFound />;
  const { trace, questions } = built;
  const finished = qi >= questions.length;
  const q = questions[Math.min(qi, questions.length - 1)];
  const correct = picked !== null && picked === q?.answer;
  const reaction =
    picked === null ? null : reactionForEvent(correct ? 'CHALLENGE_CORRECT' : 'CHALLENGE_WRONG');

  const answer = (value: string) => {
    if (picked !== null) return;
    setPicked(value);
    if (value === q.answer) setScore((s) => s + 1);
  };
  const next = () => {
    const last = qi + 1 >= questions.length;
    setPicked(null);
    setTyped('');
    setQi(qi + 1);
    if (last && score >= Math.ceil(questions.length * 0.6)) {
      const ev = award(`challenge:${def.id}`, 'challenge', def.topic);
      if (ev) {
        recordProgress(ev);
        toast(`+${ev.xp} XP — challenge complete!`, 'success');
      }
    }
  };
  const restart = () => {
    setSeed((s) => s + 1);
    setQi(0);
    setScore(0);
    setPicked(null);
    setTyped('');
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link to="/learn" className="text-xs text-ink-300 hover:text-white">
        ← Learn
      </Link>
      <header className="flex items-center gap-4">
        <Mascot
          character={def.character}
          mood={reaction?.mood ?? 'happy'}
          animation={reaction?.animation ?? 'idle'}
          size={72}
        />
        <div>
          <h1 className="font-display text-3xl font-extrabold">{def.title}</h1>
          <p className="text-ink-300">{def.description}</p>
        </div>
      </header>
      {questions.length === 0 ? (
        <Card>
          <p>
            This input produced no questions.{' '}
            <Button size="sm" onClick={restart}>
              Try another input
            </Button>
          </p>
        </Card>
      ) : finished ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center" data-testid="challenge-finished">
          <Mascot
            character={def.character}
            mood={score / questions.length >= 0.6 ? 'excited' : 'thinking'}
            animation={score / questions.length >= 0.6 ? 'celebrate' : 'hint'}
            size={96}
          />
          <p className="font-display text-2xl font-bold">
            {score} / {questions.length} correct
          </p>
          <p className="text-sm text-ink-300">
            {score / questions.length >= 0.6
              ? 'Challenge complete! XP is awarded once per challenge.'
              : 'Score 60% or more to complete the challenge.'}
          </p>
          <Button variant="primary" onClick={restart}>
            Play again with new input
          </Button>
        </Card>
      ) : (
        <>
          <p className="text-sm text-ink-300" aria-live="polite">
            Question {qi + 1} of {questions.length} · score {score}
          </p>
          <Card className="overflow-x-auto">
            <Renderer
              state={trace.steps[q.showStep].state}
              playful={playful}
              character={def.character}
              still
            />
          </Card>
          <Card>
            <p className="font-semibold" data-testid="challenge-prompt">
              {q.prompt}
            </p>
            {q.options === 'number' ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) answer(String(Number(typed)));
                }}
              >
                <input
                  aria-label="Your answer"
                  className={inputClass + ' w-32 font-mono'}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={picked !== null}
                  inputMode="numeric"
                />
                <Button type="submit" variant="primary" disabled={picked !== null}>
                  Check
                </Button>
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Answer options">
                {q.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => answer(o.id)}
                    disabled={picked !== null}
                    className={clsx(
                      'rounded-xl border px-3 py-2 font-mono text-sm',
                      picked === null
                        ? 'border-ink-600 bg-ink-800 hover:bg-ink-700'
                        : o.id === q.answer
                          ? 'border-emerald-400 bg-emerald-500/20'
                          : o.id === picked
                            ? 'border-rose-400 bg-rose-500/20'
                            : 'border-ink-700 opacity-60',
                    )}
                  >
                    {o.label}
                    {picked !== null && o.id === q.answer && ' ✓'}
                    {picked !== null && o.id === picked && o.id !== q.answer && ' ✕'}
                  </button>
                ))}
              </div>
            )}
            {picked !== null && (
              <div
                role="status"
                className={clsx(
                  'mt-4 rounded-xl p-3 text-sm',
                  correct ? 'bg-emerald-500/10 text-emerald-100' : 'bg-amber-500/10 text-amber-100',
                )}
                data-testid="challenge-feedback"
              >
                <p className="font-semibold">
                  {correct
                    ? 'Correct!'
                    : `Not quite — the answer is ${q.options === 'number' ? q.answer : q.options.find((o) => o.id === q.answer)?.label}.`}
                </p>
                <p className="mt-1">{q.explain}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={next}>
                    {qi + 1 >= questions.length ? 'Finish' : 'Next question'}
                  </Button>
                  {!correct && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPicked(null);
                        setTyped('');
                      }}
                    >
                      Retry this one
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
