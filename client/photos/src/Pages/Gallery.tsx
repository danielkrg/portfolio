import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import PhotoGrid from '../components/PhotoGrid';
import type { Photo, PhotosAppProps } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; photos: Photo[] }
  | { status: 'error' };

/**
 * The public, view-only gallery. Fetches Photos from /api/photos (Cloudinary-
 * backed, ADR-0001) and renders them as a responsive masonry in Master Order,
 * in the portfolio's light/dark theme with the global custom cursor.
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
      .then((data: { photos?: Photo[] }) => {
        if (!active) return;
        setLoad({ status: 'ready', photos: Array.isArray(data.photos) ? data.photos : [] });
      })
      .catch(() => {
        if (active) setLoad({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      <div className="max-w-7xl mx-auto px-5 pt-34 pb-30 animate-fadeInMed">
        {/* Top bar: exit + theme toggle */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={onExit}
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

        <h1 className={`font-clash text-6xl md:text-7xl ${theme.textPrimary} mb-12`}>Photos</h1>

        {load.status === 'loading' && (
          <p className={theme.textSecondary}>Loading gallery…</p>
        )}
        {load.status === 'error' && (
          <p className={theme.textSecondary}>Gallery unavailable — is the API running?</p>
        )}
        {load.status === 'ready' && load.photos.length === 0 && (
          <p className={theme.textSecondary}>No photos yet — the gallery is coming soon.</p>
        )}
        {load.status === 'ready' && load.photos.length > 0 && (
          <PhotoGrid photos={load.photos} theme={theme} />
        )}
      </div>
    </div>
  );
}
