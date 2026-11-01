import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/api/client';
import { Mascot } from '@/components/mascot/Mascot';
import { Button, Spinner } from '@/components/ui';

/** Gate for private pages. Server-side authorization is still enforced by every service. */
export function RequireAuth() {
  const { accessToken, restored } = useAuth();
  const loc = useLocation();
  if (!restored && !accessToken)
    return (
      <div className="p-10">
        <Spinner label="Checking your session" />
      </div>
    );
  if (!accessToken)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <Mascot character="byte" mood="neutral" animation="wave" size={110} />
        <h1 className="font-display text-2xl font-bold">Sign in to see this page</h1>
        <p className="text-ink-300">
          Personal progress, bookmarks, history and achievements are saved to your account.
        </p>
        <div className="flex gap-2">
          <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`}>
            <Button variant="primary">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button>Create account</Button>
          </Link>
        </div>
      </div>
    );
  return <Outlet />;
}
