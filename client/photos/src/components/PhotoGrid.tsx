import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { deriveOrientation } from '../lib/orientation';
import { columnSpan, columnsForWidth } from '../lib/masonry';
import Lightbox from './Lightbox';
import type { Photo, PhotosTheme } from '../types';

// Grid metrics. GAP matches the Tailwind `gap-4` (1rem); ROW_UNIT is the base
// auto-row height each Photo spans a whole number of, which is how a CSS grid
// fakes a masonry: a Photo's row-span is its rendered height in ROW_UNITs.
const GAP = 16;
const ROW_UNIT = 8;

function useColumnCount(): number {
  const [count, setCount] = useState(() =>
    typeof window === 'undefined' ? 1 : columnsForWidth(window.innerWidth),
  );
  useEffect(() => {
    const onResize = () => setCount(columnsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

/** Track the grid's own pixel width, so row-spans can be derived from it. */
function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function PhotoFigure({
  photo,
  span,
  rowSpan,
  onOpen,
}: {
  photo: Photo;
  span: number;
  rowSpan: number;
  onOpen: () => void;
}) {
  return (
    <figure
      data-cursor="image"
      data-orientation={deriveOrientation(photo.width, photo.height)}
      // outline-none clears the UA focus ring left after a mouse click (and on
      // return from the viewer); focus-visible restores one for keyboard users.
      className="overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-3px]"
      style={{ gridColumn: `span ${span}`, gridRow: `span ${rowSpan}` }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={photo.caption ?? photo.alt ?? 'Open photo full-screen'}
    >
      <img
        src={photo.thumbnailUrl}
        alt={photo.alt ?? photo.caption ?? ''}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        className="block h-full w-full object-cover"
      />
    </figure>
  );
}

interface PhotoGridProps {
  photos: Photo[];
  theme: PhotosTheme;
}

/**
 * Responsive masonry that preserves Master Order. The grid has `columnCount`
 * equal-width columns; each Photo spans one to three of them by aspect ratio
 * (3:2 → 2, 21:9 → 3), clamped to what the viewport offers, and spans however
 * many ROW_UNIT rows its rendered height needs. `grid-auto-flow: dense`
 * backfills the gaps a wide Photo would otherwise leave.
 */
export default function PhotoGrid({ photos, theme }: PhotoGridProps) {
  const columnCount = useColumnCount();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridWidth = useMeasuredWidth(gridRef);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Map a Photo to its position in the displayed set, so the viewer pages
  // through `photos` in Master Order regardless of grid placement.
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((photo, i) => map.set(photo.id, i));
    return map;
  }, [photos]);

  const colWidth =
    gridWidth > 0 ? (gridWidth - (columnCount - 1) * GAP) / columnCount : 0;

  const laidOut = photos.map((photo) => {
    const span = Math.min(columnSpan(photo), columnCount);
    const width = colWidth * span + (span - 1) * GAP;
    const height = width * (photo.height / photo.width);
    // +GAP on both sides so the trailing gap is counted once per spanned row.
    const rowSpan =
      colWidth > 0 ? Math.max(1, Math.round((height + GAP) / (ROW_UNIT + GAP))) : 1;
    return { photo, span, rowSpan };
  });

  return (
    <>
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_UNIT}px`,
          gridAutoFlow: 'row dense',
          gap: `${GAP}px`,
        }}
      >
        {laidOut.map(({ photo, span, rowSpan }) => (
          <PhotoFigure
            key={photo.id}
            photo={photo}
            span={span}
            rowSpan={rowSpan}
            onOpen={() => setOpenIndex(indexById.get(photo.id) ?? 0)}
          />
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          theme={theme}
        />
      )}
    </>
  );
}
