import { useAuth } from '@/api/client';
import { usePreferencesSync } from '@/api/hooks';
import { Button, Card, useToasts } from '@/components/ui';
import { usePrefs, type MotionPref } from '@/store/prefs';
import { useProgress } from '@/store/progress';
import { ModeToggle } from '@/app/Layout';

export default function Profile() {
  const user = useAuth((s) => s.user)!;
  const prefs = usePrefs();
  const sync = usePreferencesSync();
  const reset = useProgress((s) => s.reset);
  const toast = useToasts((s) => s.push);
  const save = () =>
    sync.mutate(
      { mode: prefs.mode, gamification: prefs.gamification, motion: prefs.motion },
      { onSuccess: () => toast('Preferences saved', 'success'), onError: (e) => toast(e.message, 'error') },
    );
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Profile & preferences</h1>
      <Card>
        <p className="text-sm">
          <span className="text-ink-300">Name:</span> {user.displayName}
        </p>
        <p className="text-sm">
          <span className="text-ink-300">Email:</span> {user.email}
        </p>
      </Card>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span>Presentation mode</span>
          <ModeToggle />
        </div>
        <label className="flex items-center justify-between">
          <span>Gamification (XP, badges, levels)</span>
          <input
            type="checkbox"
            checked={prefs.gamification}
            onChange={(e) => prefs.setGamification(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Motion</span>
          <select
            className="rounded-lg bg-ink-850 px-2 py-1"
            value={prefs.motion}
            onChange={(e) => prefs.setMotion(e.target.value as MotionPref)}
          >
            <option value="system">Follow system setting</option>
            <option value="reduce">Reduce motion</option>
            <option value="full">Full motion</option>
          </select>
        </label>
        <Button variant="primary" onClick={save} disabled={sync.isPending}>
          Save preferences to account
        </Button>
      </Card>
      <Card>
        <p className="text-sm text-ink-300">Local progress cache</p>
        <Button
          variant="danger"
          size="sm"
          className="mt-2"
          onClick={() => {
            reset();
            toast('Local progress cleared (server copy unaffected)');
          }}
        >
          Clear local progress
        </Button>
      </Card>
    </div>
  );
}
