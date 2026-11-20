import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { stepIndex } from '../lib/paging';
import type { Photo, PhotosTheme } from '../types';

interface LightboxProps {
  /** The currently displayed set; arrow keys move through exactly these. */
  photos: Photo[];
  /** Index into `photos` of the open Photo. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Resolved portfolio theme, so the viewer matches the gallery's palette. */
  theme: PhotosTheme;
  /** Viewport rect of the clicked gallery cell, captured at open time. */
  originRect: DOMRect | null;
  /**
   * Scroll the gallery so the given Photo is in view and return its cell rect —
   * the box the image collapses back into on close. Null if it can't be found.
   */
  collapseTargetFor: (photoId: string) => DOMRect | null;
}

const ANIM_MS = 350;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Transform that maps the `from` box onto the `to` box (both measured, centred origin). */
function flipTransform(to: DOMRect, from: DOMRect): string {
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

/**
 * Full-screen viewer. Opening a Photo expands the clicked gallery cell to fill
 * the screen (a shared-element FLIP); closing reverses it, collapsing the image
 * back into its gallery cell — after scrolling the gallery so that cell (the one
 * the visitor arrow-keyed to) is on screen. ArrowLeft/ArrowRight page through
 * the set (wrapping) with the chevrons and counter hidden; Escape or the close
 * control exits. The backdrop is a flat fill in the active theme colour.
 */
export default function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  theme,
  originRect,
  collapseTargetFor,
}: LightboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const closingRef = useRef(false);

  const page = (delta: number) => {
    if (!closingRef.current) onIndexChange(stepIndex(index, delta, photos.length));
  };

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    const img = imgRef.current;
    const container = containerRef.current;
    const dest = collapseTargetFor(photos[index].id);

    container?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: ANIM_MS,
      easing: EASING,
      fill: 'forwards',
    });

    if (img && dest) {
      const from = img.getBoundingClientRect();
      const anim = img.animate([{ transform: 'none' }, { transform: flipTransform(dest, from) }], {
        duration: ANIM_MS,
        easing: EASING,
        fill: 'forwards',
      });
      anim.onfinish = onClose;
      // Safety net in case onfinish doesn't fire (e.g. reduced-motion no-op).
      window.setTimeout(onClose, ANIM_MS + 80);
    } else {
      window.setTimeout(onClose, ANIM_MS);
    }
  };

  // Expand: fade the backdrop in and animate the image from the clicked cell up
  // to full screen. Runs once, before paint, so neither starts with a flash.
  useLayoutEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    container?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ANIM_MS, easing: EASING });
    if (img && originRect) {
      const to = img.getBoundingClientRect();
      if (to.width > 0 && to.height > 0) {
        img.animate([{ transform: flipTransform(originRect, to) }, { transform: 'none' }], {
          duration: ANIM_MS,
          easing: EASING,
        });
      }
    }
    // Mount-only: later index changes are page swaps, not re-expansions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') page(-1);
      else if (e.key === 'ArrowRight') page(1);
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Re-bind when index changes so the handler pages from the current photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  const photo = photos[index];
  if (!photo) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg}`}
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
        className={`absolute top-5 left-5 z-10 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <XMarkIcon className="h-8 w-8" />
      </button>

      {photo.caption && (
        <p
          className={`absolute top-5 left-1/2 -translate-x-1/2 z-10 max-w-[60vw] truncate text-center text-sm font-light tracking-normal ${theme.textSecondary}`}
        >
          {photo.caption}
        </p>
      )}

      <button
        onClick={(e) => {
          stop(e);
          page(-1);
        }}
        aria-label="Previous photo"
        className={`absolute left-3 sm:left-6 z-10 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <ChevronLeftIcon className="h-10 w-10" />
      </button>

      <img
        ref={imgRef}
        key={photo.id}
        src={photo.url}
        alt={photo.alt ?? photo.caption ?? ''}
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        className="max-h-screen max-w-[100vw] object-contain"
        onClick={stop}
      />

      <button
        onClick={(e) => {
          stop(e);
          page(1);
        }}
        aria-label="Next photo"
        className={`absolute right-3 sm:right-6 z-10 transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
      >
        <ChevronRightIcon className="h-10 w-10" />
      </button>
    </div>
  );
}
