import { useEffect, useState, type MouseEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { stepIndex } from '../lib/paging';
import type { Photo, PhotosTheme } from '../types';

interface LightboxProps {
  /** The currently displayed set; paging moves through exactly these. */
  photos: Photo[];
  /** Index into `photos` of the open Photo. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Resolved portfolio theme, so the viewer matches the gallery's palette. */
  theme: PhotosTheme;
}

const CLOSE_MS = 500;

/**
 * Full-screen viewer, reimplementing the portfolio's hand-rolled lightbox in
 * TypeScript (ticket #5). Chevrons + ArrowLeft/ArrowRight page through the
 * displayed set (wrapping); Escape or the close control exits. The full-res
 * image is inert to the global custom cursor (no "+" expansion). The backdrop is
 * a flat fill in the active theme colour (not a dimmed overlay), the caption sits
 * inline with the close control and counter, and the image fills nearly the
 * full height.
 */
export default function Lightbox({ photos, index, onIndexChange, onClose, theme }: LightboxProps) {
  const [closing, setClosing] = useState(false);

  const page = (delta: number) => onIndexChange(stepIndex(index, delta, photos.length));

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') page(-1);
      else if (e.key === 'ArrowRight') page(1);
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Re-bind when index changes so the handler pages from the current photo.
  }, [index, photos.length]);

  const photo = photos[index];
  if (!photo) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center animate-fadeInFast ${theme.bg}`}
      style={{ opacity: closing ? 0 : undefined, transition: `opacity ${CLOSE_MS}ms ease` }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <button
        onClick={(e) => {
          stop(e);
          close();
        }}
        aria-label="Close"
        className={`absolute top-5 left-5 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <XMarkIcon className="h-8 w-8" />
      </button>

      {photo.caption && (
        <p
          className={`absolute top-5 left-1/2 -translate-x-1/2 max-w-[60vw] truncate text-center text-sm font-light tracking-normal ${theme.textSecondary}`}
        >
          {photo.caption}
        </p>
      )}

      <p className={`absolute top-5 right-5 text-sm ${theme.textSecondary}`}>
        {index + 1} / {photos.length}
      </p>

      <button
        onClick={(e) => {
          stop(e);
          page(-1);
        }}
        aria-label="Previous photo"
        className={`absolute left-3 sm:left-6 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <ChevronLeftIcon className="h-10 w-10" />
      </button>

      <figure className="flex items-center justify-center px-16 pt-16 pb-6 sm:px-24" onClick={stop}>
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.alt ?? photo.caption ?? ''}
          className="max-h-[90vh] max-w-[88vw] object-contain animate-fadeInFast"
        />
      </figure>

      <button
        onClick={(e) => {
          stop(e);
          page(1);
        }}
        aria-label="Next photo"
        className={`absolute right-3 sm:right-6 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <ChevronRightIcon className="h-10 w-10" />
      </button>
    </div>
  );
}
