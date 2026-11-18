import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import PhotoGrid from '../components/PhotoGrid';
import type { Photo, PhotosAppProps } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; photos: Photo[] }
  | { status: 'error' };

/**
 * The public, view-only gallery. Fetches Photos from /api/photos (Cloudinary-
 * backed, ADR-0001) and renders them as a responsive masonry in Master Order,
 * in the portfolio's light/dark theme with the global custom cursor. The
 * full-screen cover is the landing; the grid loads underneath it.
 */
export default function Gallery({ isDark, setIsDark, theme, onExit, coverUrl }: PhotosAppProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [showArrow, setShowArrow] = useState(true);
  const coverRef = useRef<HTMLElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);

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

  // The jump arrow lives on the cover; hide it once the visitor scrolls the
  // cover mostly out of view (i.e. once they're into the gallery).
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowArrow(entry.isIntersecting && entry.intersectionRatio >= 0.75),
      { threshold: [0, 0.75, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const jumpToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      {/* Exit: fixed to the top-left corner of the viewport so it stays put as
          the visitor scrolls. Position and size mirror the StarSync home page. */}
      <div className="absolute top-4 left-4 z-50 animate-fadeInMed">
        <button
          onClick={onExit}
          className={`font-semibold py-2 px-4 rounded-full transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
        >
          Exit
        </button>
      </div>

      {/* Landing cover: full-screen backdrop with placeholder copy on the right.
          The gallery renders underneath, so its images load while the visitor
          is still on the cover. */}
      <section ref={coverRef} className="relative h-screen w-full animate-fadeInMed">
        <div className="absolute inset-0 overflow-hidden">
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-end mr-10 p-8 sm:p-16">
            <div className="max-w-sm text-right text-white">
              <h2 className="font-clash text-4xl md:text-5xl mb-4">Placeholder title</h2>
              <p className="font-light text-white/80">
                Placeholder description — a short line of copy introducing the
                gallery will live here.
              </p>
            </div>
          </div>
        </div>

        {/* Jump-to-gallery arrow; fades out once the cover is scrolled away. */}
        <button
          onClick={jumpToGallery}
          aria-label="Jump to gallery"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-white/80 hover:text-white transition-opacity duration-300 cursor-pointer"
          style={{ opacity: showArrow ? 1 : 0, pointerEvents: showArrow ? 'auto' : 'none' }}
        >
          <ChevronDownIcon className="h-9 w-9 animate-bounce" />
        </button>
      </section>

      <div ref={galleryRef} className="max-w-7xl mx-auto px-5 pt-34 pb-30 animate-fadeInMed">
        {/* Controls bar: the light/dark toggle on the right, where the upcoming
            filtering icons will sit beside it. (Exit now lives fixed at the
            top-left of the viewport.) */}
        <div className="flex items-center justify-end gap-4 mb-16">
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
