import { Card } from '@/components/ui';
import { BADGES, earnedBadges, useProgress, xpByTopic } from '@/store/progress';

export default function Achievements() {
  const events = useProgress((s) => s.events);
  const earned = new Set(earnedBadges(events).map((b) => b.id));
  const byTopic = xpByTopic(events);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Achievements</h1>
      <p className="text-sm text-ink-300">
        Badges are earned through meaningful milestones. Repeating the same visualization or challenge never
        awards XP twice, and there are no streak penalties.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const have = b.topics.reduce((s, t) => s + (byTopic[t] ?? 0), 0);
          const got = earned.has(b.id);
          return (
            <Card key={b.id} className={got ? 'border-amber-400/50' : 'opacity-70'}>
              <p className="text-3xl" aria-hidden>
                {got ? b.emoji : '🔒'}
              </p>
              <h2 className="mt-1 font-semibold">{b.name}</h2>
              <p className="text-sm text-ink-300">{b.description}</p>
              <p className="mt-2 text-xs text-ink-400">
                {got ? 'Unlocked' : `${Math.min(have, b.threshold)} / ${b.threshold} XP`}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
