import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import PhotoGrid from '../components/PhotoGrid';
import FilterBar from '../components/FilterBar';
import { collectTags, filterPhotos, nextTagMode, type TagMode } from '../lib/filters';
import type { Orientation } from '../lib/orientation';
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
export default function Gallery({ isDark, theme, onExit, coverUrl }: PhotosAppProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [showArrow, setShowArrow] = useState(true);
  const [orientations, setOrientations] = useState<ReadonlySet<Orientation>>(new Set());
  const [tagModes, setTagModes] = useState<Record<string, TagMode>>({});
  const coverRef = useRef<HTMLElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  const toggleOrientation = (orientation: Orientation) =>
    setOrientations((prev) => {
      const next = new Set(prev);
      if (next.has(orientation)) next.delete(orientation);
      else next.add(orientation);
      return next;
    });

  const toggleTag = (tag: string) =>
    setTagModes((prev) => {
      const mode = nextTagMode(prev[tag]);
      const next = { ...prev };
      if (mode) next[tag] = mode;
      else delete next[tag];
      return next;
    });

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

  const allPhotos = load.status === 'ready' ? load.photos : [];
  const allTags = useMemo(() => collectTags(allPhotos), [allPhotos]);
  const visiblePhotos = useMemo(
    () => filterPhotos(allPhotos, orientations, tagModes),
    [allPhotos, orientations, tagModes],
  );

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

      <div ref={galleryRef} className="px-2 pt-30 pb-30 animate-fadeInMed">
        {/* Header: the centred Gallery title flanked by thin rules that run to
            both screen edges (within the gallery's side margins) and sit on the
            title's vertical centre. (Exit lives fixed at the top-left.) */}
        <div className="flex items-center gap-6">
          <div className="h-px flex-1 bg-white/15" />
          <h1 className={`text-7xl font-extrabold tracking-wide md:text-8xl ${theme.textPrimary}`}>
            Gallery
          </h1>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {/* Filter row: tag filters on the left (wrapping at mid-screen),
            orientation filters on the right, aligned to the last tag row. */}
        {load.status === 'ready' && allPhotos.length > 0 && (
          <div className="mt-10 mb-4">
            <FilterBar
              tags={allTags}
              tagModes={tagModes}
              onToggleTag={toggleTag}
              orientations={orientations}
              onToggleOrientation={toggleOrientation}
              theme={theme}
              isDark={isDark}
            />
          </div>
        )}

        {load.status === 'loading' && (
          <p className={theme.textSecondary}>Loading gallery…</p>
        )}
        {load.status === 'error' && (
          <p className={theme.textSecondary}>Gallery unavailable — is the API running?</p>
        )}
        {load.status === 'ready' && load.photos.length === 0 && (
          <p className={theme.textSecondary}>No photos yet — the gallery is coming soon.</p>
        )}
        {load.status === 'ready' && load.photos.length > 0 && visiblePhotos.length === 0 && (
          <p className={theme.textSecondary}>No photos match the current filters.</p>
        )}
        {load.status === 'ready' && visiblePhotos.length > 0 && (
          <PhotoGrid photos={visiblePhotos} theme={theme} />
        )}
      </div>
    </div>
  );
}
