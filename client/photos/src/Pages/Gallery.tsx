import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { PhotosAppProps } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; count: number }
  | { status: 'error' };

/**
 * Placeholder gallery for the tracer-bullet slice. It renders in the
 * portfolio's light/dark theme, relies on the portfolio's global custom
 * cursor, and fetches the (currently empty) photo list from /api/photos to
 * prove the client -> Vite proxy -> server path end to end.
 */
export default function Gallery({ isDark, setIsDark, theme, onExit }: PhotosAppProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetch('/api/photos')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { photos?: unknown[] }) => {
        if (!active) return;
        const count = Array.isArray(data.photos) ? data.photos.length : 0;
        setLoad({ status: 'ready', count });
      })
      .catch(() => {
        if (active) setLoad({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  const status =
    load.status === 'loading'
      ? 'Loading gallery…'
      : load.status === 'error'
        ? 'Gallery unavailable — is the API running?'
        : load.count === 0
          ? 'No photos yet — the gallery is coming soon.'
          : `${load.count} ${load.count === 1 ? 'photo' : 'photos'}`;

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      <div className="max-w-7xl mx-auto px-5 pt-34 pb-30 animate-fadeInMed">
        {/* Top bar: back + theme toggle */}
        <div className="flex items-center justify-between mb-24">
          <button
            onClick={onExit}
            data-cursor="app"
            className={`text-xs tracking-widest font-medium transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
          >
            Exit
          </button>
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className={`transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
            aria-label="Toggle dark mode"
          >
            {isDark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </button>
        </div>

        <h1 className={`font-clash text-6xl md:text-7xl ${theme.textPrimary}`}>Photos</h1>
        <p className={`mt-6 ${theme.textSecondary}`}>{status}</p>
      </div>
    </div>
  );
}
