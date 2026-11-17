import { useEffect, useState, type MouseEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { stepIndex } from '../lib/paging';
import type { Photo } from '../types';

interface LightboxProps {
  /** The currently displayed set; paging moves through exactly these. */
  photos: Photo[];
  /** Index into `photos` of the open Photo. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const CLOSE_MS = 500;

/**
 * Full-screen viewer, reimplementing the portfolio's hand-rolled lightbox in
 * TypeScript (ticket #5). Chevrons + ArrowLeft/ArrowRight page through the
 * displayed set (wrapping); Escape or the close control exits; the full-res
 * image carries the global `data-cursor="image"` "+" cursor.
 */
export default function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fadeInFast"
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
        className="absolute top-5 left-5 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
      >
        <XMarkIcon className="h-8 w-8" />
      </button>

      <p className="absolute top-5 right-5 text-sm text-white/50">
        {index + 1} / {photos.length}
      </p>

      <button
        onClick={(e) => {
          stop(e);
          page(-1);
        }}
        aria-label="Previous photo"
        className="absolute left-3 sm:left-6 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
      >
        <ChevronLeftIcon className="h-10 w-10" />
      </button>

      <figure className="flex flex-col items-center gap-6 px-16 sm:px-24" onClick={stop}>
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.alt ?? photo.caption ?? ''}
          data-cursor="image"
          className="max-h-[80vh] max-w-[80vw] object-contain animate-fadeInFast"
        />
        {photo.caption && (
          <figcaption className="text-white/50 font-light tracking-normal text-center">
            {photo.caption}
          </figcaption>
        )}
      </figure>

      <button
        onClick={(e) => {
          stop(e);
          page(1);
        }}
        aria-label="Next photo"
        className="absolute right-3 sm:right-6 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
      >
        <ChevronRightIcon className="h-10 w-10" />
      </button>
    </div>
  );
}
