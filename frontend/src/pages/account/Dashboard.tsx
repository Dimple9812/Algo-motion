import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/algorithms/registry';
import { useAuth } from '@/api/client';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui';
import { earnedBadges, level, totalXp, useProgress, xpByTopic } from '@/store/progress';
import { usePrefs } from '@/store/prefs';

export default function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const events = useProgress((s) => s.events);
  const gamification = usePrefs((s) => s.gamification);
  const xp = totalXp(events);
  const lv = level(xp);
  const byTopic = xpByTopic(events);
  const recent = [...events].reverse().slice(0, 8);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Mascot character="byte" mood="happy" animation="wave" size={80} />
        <div>
          <h1 className="font-display text-3xl font-extrabold">Hi, {user.displayName}</h1>
          <p className="text-ink-300">Your learning dashboard.</p>
        </div>
      </header>
      {gamification && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs text-ink-300">Level</p>
            <p className="font-display text-4xl font-bold text-amber-300">{lv.level}</p>
            <p className="text-xs text-ink-400">
              {lv.into} / {lv.needed} XP to next level
            </p>
          </Card>
          <Card>
            <p className="text-xs text-ink-300">Total XP</p>
            <p className="font-display text-4xl font-bold">{xp}</p>
          </Card>
          <Card>
            <p className="text-xs text-ink-300">Badges</p>
            <p className="font-display text-4xl font-bold">{earnedBadges(events).length}</p>
            <Link to="/achievements" className="text-xs text-sky-300">
              View all →
            </Link>
          </Card>
        </div>
      )}
      <Card>
        <h2 className="font-semibold">Topic mastery</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {CATEGORIES.map((c) => {
            const v = byTopic[c.id] ?? 0;
            return (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <span className="w-44 truncate">{c.name}</span>
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800"
                  role="progressbar"
                  aria-valuenow={Math.min(v, 60)}
                  aria-valuemin={0}
                  aria-valuemax={60}
                  aria-label={`${c.name} mastery`}
                >
                  <span
                    className="block h-full"
                    style={{ width: `${Math.min(100, (v / 60) * 100)}%`, background: c.accent }}
                  />
                </span>
                <span className="w-12 text-right font-mono text-xs text-ink-300">{v} XP</span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">Recent milestones</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-300">Nothing yet — finish a visualization or a challenge.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recent.map((e) => (
              <li key={e.key} className="flex justify-between">
                <span>{e.key}</span>
                <span className="text-ink-400">
                  +{e.xp} XP · {new Date(e.at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
