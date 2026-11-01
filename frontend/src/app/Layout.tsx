import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/api/client';
import { useLogout, useServerProgress } from '@/api/hooks';
import { level, totalXp, useProgress } from '@/store/progress';
import { prefersReducedMotion, usePrefs } from '@/store/prefs';

const NAV = [
  { to: '/visualizer', label: 'AlgoVerse' },
  { to: '/problems', label: 'Problems' },
  { to: '/solve', label: 'AI Solver' },
  { to: '/learn', label: 'Learn' },
  { to: '/about', label: 'About' },
];

export function ModeToggle() {
  const { mode, toggleMode } = usePrefs();
  return (
    <button
      onClick={toggleMode}
      role="switch"
      aria-checked={mode === 'technical'}
      aria-label={`Presentation mode: ${mode}. Switch to ${mode === 'playful' ? 'technical' : 'playful'} mode`}
      className="flex h-9 items-center gap-1 rounded-full border border-ink-600 bg-ink-850 p-1 text-xs font-semibold"
      data-testid="mode-toggle"
    >
      <span
        className={clsx(
          'rounded-full px-2.5 py-1',
          mode === 'playful' ? 'bg-pink-400 text-ink-950' : 'text-ink-300',
        )}
      >
        🎈 Playful
      </span>
      <span
        className={clsx(
          'rounded-full px-2.5 py-1',
          mode === 'technical' ? 'bg-sky-400 text-ink-950' : 'text-ink-300',
        )}
      >
        ⌘ Technical
      </span>
    </button>
  );
}

function XpChip() {
  const events = useProgress((s) => s.events);
  const merge = useProgress((s) => s.merge);
  const enabled = usePrefs((s) => s.gamification);
  const server = useServerProgress();
  useEffect(() => {
    if (server.data) merge(server.data.events);
  }, [server.data, merge]);
  if (!enabled) return null;
  const xp = totalXp(events);
  const lv = level(xp);
  return (
    <Link
      to="/achievements"
      className="hidden items-center gap-2 rounded-full bg-ink-850 px-3 py-1.5 text-xs md:flex"
      aria-label={`Level ${lv.level}, ${xp} XP`}
    >
      <span className="font-bold text-amber-300">Lv {lv.level}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-700">
        <span className="block h-full bg-amber-300" style={{ width: `${(lv.into / lv.needed) * 100}%` }} />
      </span>
      <span className="text-ink-300">{xp} XP</span>
    </Link>
  );
}

export function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const motionPref = usePrefs((s) => s.motion);
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <div className={clsx('flex min-h-screen flex-col', prefersReducedMotion(motionPref) && 'reduce-motion')}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-sky-400 focus:px-3 focus:py-2 focus:text-ink-950"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-extrabold"
            aria-label="AlgoMotion home"
          >
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            Algo<span className="text-sky-400">Motion</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    isActive ? 'bg-ink-800 text-white' : 'text-ink-300 hover:text-white',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <XpChip />
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            {user ? (
              <div className="hidden items-center gap-1 lg:flex">
                <NavLink
                  to="/dashboard"
                  className="rounded-lg px-3 py-1.5 text-sm text-ink-300 hover:text-white"
                >
                  {user.displayName}
                </NavLink>
                <button
                  onClick={() => logout.mutate()}
                  className="rounded-lg px-3 py-1.5 text-sm text-ink-300 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden rounded-lg bg-ink-800 px-3 py-1.5 text-sm font-semibold hover:bg-ink-700 lg:block"
              >
                Sign in
              </Link>
            )}
            <button
              className="rounded-lg p-2 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label="Open menu"
              onClick={() => setOpen((o) => !o)}
            >
              ☰
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="flex flex-col gap-1 border-t border-ink-800 px-4 py-3 lg:hidden"
          >
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="rounded-lg px-3 py-2 text-sm hover:bg-ink-800">
                {n.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/dashboard" className="rounded-lg px-3 py-2 text-sm hover:bg-ink-800">
                  Dashboard
                </NavLink>
                <button
                  onClick={() => logout.mutate()}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="rounded-lg px-3 py-2 text-sm hover:bg-ink-800">
                Sign in
              </NavLink>
            )}
            <div className="pt-2">
              <ModeToggle />
            </div>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-ink-800 py-6 text-center text-xs text-ink-400">
        AlgoMotion · open-source learning project · characters and artwork are original ·{' '}
        <Link to="/about" className="underline">
          architecture
        </Link>
      </footer>
    </div>
  );
}
