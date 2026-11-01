import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, OfflineError } from '@/api/client';
import { useLogin, useRegister } from '@/api/hooks';
import { Mascot } from '@/components/mascot/Mascot';
import { Button, Card, Field, inputClass } from '@/components/ui';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const login = useLogin();
  const register = useRegister();
  const m = mode === 'login' ? login : register;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/dashboard';
  const err = m.error;
  const fieldErr = (k: string) => (err instanceof ApiError ? (err.details?.[k] ?? null) : null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const done = { onSuccess: () => navigate(next) };
    if (mode === 'login') login.mutate({ email, password }, done);
    else register.mutate({ email, password, displayName }, done);
  };
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
      <Mascot
        character="byte"
        mood={err ? 'sad' : 'happy'}
        animation={m.isPending ? 'loading' : 'wave'}
        size={96}
      />
      <Card className="w-full">
        <h1 className="font-display text-2xl font-bold">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate>
          {mode === 'register' && (
            <Field label="Display name" error={fieldErr('displayName')}>
              <input
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
              />
            </Field>
          )}
          <Field label="Email" error={fieldErr('email')}>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field
            label="Password"
            hint={mode === 'register' ? 'At least 8 characters, including a letter and a number.' : undefined}
            error={fieldErr('password')}
          >
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
          {err && !(err instanceof ApiError && err.details) && (
            <p role="alert" className="text-sm text-rose-300">
              {err instanceof OfflineError
                ? 'The backend is not reachable. Accounts need the user service running.'
                : err.message}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={m.isPending}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-ink-300">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <Link className="text-sky-300 underline" to="/register">
                Register
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link className="text-sky-300 underline" to="/login">
                Sign in
              </Link>
            </>
          )}
        </p>
      </Card>
    </div>
  );
}
