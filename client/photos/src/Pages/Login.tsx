import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PhotosAppProps } from '../types';

/**
 * The Owner login (ADR-0002). Reachable ONLY by navigating directly to the
 * unlisted /apps/photos/login — nothing in the public UI links here. A correct
 * password sets an httpOnly session cookie server-side; the plaintext never
 * touches client storage. On success the Owner returns to the gallery.
 */
export default function Login({ theme }: PhotosAppProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'throttled'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/photos/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword('');
        navigate('/apps/photos');
        return;
      }
      setStatus(res.status === 429 ? 'throttled' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      <div className="max-w-sm mx-auto px-5 pt-44 animate-fadeInMed">
        <h1 className={`font-clash text-4xl ${theme.textPrimary} mb-8`}>Sign in</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            aria-label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (status !== 'submitting') setStatus('idle');
            }}
            className={`w-full rounded-md border px-3 py-2 bg-transparent outline-none ${theme.border} ${theme.textPrimary}`}
          />
          <button
            type="submit"
            disabled={status === 'submitting' || password.length === 0}
            data-cursor="app"
            className={`rounded-md px-3 py-2 text-xs tracking-widest font-medium cursor-pointer transition-colors duration-200 border ${theme.borderAccent} ${theme.textPrimary} ${theme.textHover} disabled:opacity-40`}
          >
            {status === 'submitting' ? 'Signing in…' : 'Sign in'}
          </button>
          {status === 'error' && (
            <p className={theme.textSecondary} role="alert">
              Incorrect password.
            </p>
          )}
          {status === 'throttled' && (
            <p className={theme.textSecondary} role="alert">
              Too many attempts — please wait a little and try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
