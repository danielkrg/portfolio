import { useEffect, useMemo, useState } from 'react';
import { deriveOrientation } from '../lib/orientation';
import { columnsForWidth, toBlocks, toColumns } from '../lib/masonry';
import Lightbox from './Lightbox';
import type { Photo } from '../types';

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

function PhotoFigure({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  return (
    <figure
      data-cursor="image"
      data-orientation={deriveOrientation(photo.width, photo.height)}
      className="overflow-hidden rounded-sm"
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
        className="block w-full h-auto"
      />
    </figure>
  );
}

interface PhotoGridProps {
  photos: Photo[];
}

/**
 * Responsive masonry that preserves Master Order left-to-right. The column
 * count scales with viewport width, each Photo keeps its true aspect ratio, and
 * ultra-wide Photos span the full width as their own row.
 */
export default function PhotoGrid({ photos }: PhotoGridProps) {
  const columnCount = useColumnCount();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Map a Photo to its position in the displayed set, so the viewer pages
  // through `photos` in Master Order regardless of masonry column layout.
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((photo, i) => map.set(photo.id, i));
    return map;
  }, [photos]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {toBlocks(photos).map((block) =>
          block.kind === 'wide' ? (
            <PhotoFigure
              key={block.photo.id}
              photo={block.photo}
              onOpen={() => setOpenIndex(indexById.get(block.photo.id) ?? 0)}
            />
          ) : (
            <div key={block.photos[0].id} className="flex gap-4">
              {toColumns(block.photos, columnCount).map((column, columnIndex) => (
                <div key={columnIndex} className="flex flex-1 min-w-0 flex-col gap-4">
                  {column.map((photo) => (
                    <PhotoFigure
                      key={photo.id}
                      photo={photo}
                      onOpen={() => setOpenIndex(indexById.get(photo.id) ?? 0)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ),
        )}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
