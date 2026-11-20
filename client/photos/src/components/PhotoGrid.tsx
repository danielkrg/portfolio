import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { deriveOrientation } from '../lib/orientation';
import { columnsForWidth } from '../lib/masonry';
import Lightbox from './Lightbox';
import type { Photo, PhotosTheme } from '../types';

// Grid metrics. GAP is the space between Photos (matched by the page's side
// margins); ROW_UNIT is the base auto-row height each Photo spans a whole number
// of, which is how a CSS grid fakes a masonry: a Photo's row-span is its
// rendered height in ROW_UNITs.
const GAP = 8;
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
  nextId,
  span,
  rowSpan,
  editMode,
  selected,
  reorderable,
  dragging,
  insertBefore,
  insertAfterLast,
  theme,
  onOpen,
  onToggleSelect,
  onDragStartCell,
  onDragHover,
  onDropCell,
  onDragEndCell,
  registerRef,
}: {
  photo: Photo;
  /** The id of the Photo that follows this one in Master Order (null if last). */
  nextId: string | null;
  span: number;
  rowSpan: number;
  editMode: boolean;
  selected: boolean;
  reorderable: boolean;
  /** This cell is part of the block currently being dragged (dim it). */
  dragging: boolean;
  /** Show the drop indicator on this cell's leading edge (block lands before it). */
  insertBefore: boolean;
  /** This is the last cell and the block will land at the very end. */
  insertAfterLast: boolean;
  theme: PhotosTheme;
  onOpen: (el: HTMLElement) => void;
  onToggleSelect: (id: string) => void;
  onDragStartCell: (id: string) => void;
  /** Hover during a drag: `targetId` is the Photo to insert before (null = end). */
  onDragHover: (targetId: string | null) => void;
  onDropCell: () => void;
  onDragEndCell: () => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  // In Edit Mode the cell is a selection toggle, not a door into the viewer.
  const activate = (el: HTMLElement) => (editMode ? onToggleSelect(photo.id) : onOpen(el));
  return (
    <figure
      ref={(el) => registerRef(photo.id, el)}
      // The magnify cursor hints "opens the viewer"; in Edit Mode the cell
      // selects instead, so drop it there and show the plain pointer.
      data-cursor={editMode ? undefined : 'image'}
      data-orientation={deriveOrientation(photo.width, photo.height)}
      draggable={reorderable}
      // outline-none clears the UA focus ring left after a mouse click (and on
      // return from the viewer); focus-visible restores one for keyboard users.
      className={`relative overflow-hidden outline-none transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-3px] ${
        editMode ? 'cursor-pointer' : ''
      } ${reorderable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-40' : ''}`}
      style={{ gridColumn: `span ${span}`, gridRow: `span ${rowSpan}` }}
      onClick={(e) => activate(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(e.currentTarget);
        }
      }}
      onDragStart={(e) => {
        // Firefox requires data to be set for a drag to begin at all.
        e.dataTransfer.setData('text/plain', photo.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStartCell(photo.id);
      }}
      onDragOver={
        reorderable
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              // Leading half of the cell → land before it; trailing half → land
              // before the next cell (null past the last one, i.e. at the end).
              const rect = e.currentTarget.getBoundingClientRect();
              const after = e.clientX - rect.left > rect.width / 2;
              onDragHover(after ? nextId : photo.id);
            }
          : undefined
      }
      onDrop={
        reorderable
          ? (e) => {
              e.preventDefault();
              onDropCell();
            }
          : undefined
      }
      onDragEnd={reorderable ? onDragEndCell : undefined}
      role="button"
      tabIndex={0}
      aria-pressed={editMode ? selected : undefined}
      aria-label={
        editMode
          ? `${selected ? 'Deselect' : 'Select'} ${photo.caption ?? photo.alt ?? 'photo'}`
          : (photo.caption ?? photo.alt ?? 'Open photo full-screen')
      }
    >
      <img
        src={photo.thumbnailUrl}
        alt={photo.alt ?? photo.caption ?? ''}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        className="block h-full w-full object-cover"
      />
      {editMode && (
        <>
          {/* Dim + inset ring on selection; a faint wash on hover otherwise. */}
          <div
            className={`pointer-events-none absolute inset-0 transition-colors duration-150 ${
              selected ? 'bg-black/40 ring-2 ring-inset ring-white' : 'bg-transparent hover:bg-black/15'
            }`}
          />
          {/* Checkbox affordance, top-right of the cell. */}
          <div
            className={`pointer-events-none absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
              selected ? 'border-white bg-white text-black' : 'border-white/80 bg-black/25 text-transparent'
            }`}
          >
            <CheckIcon className="h-4 w-4" strokeWidth={3} />
          </div>
          {/* The cell's tags, top-left, styled as the FilterBar pills (same
              shape, padding and type) for one visual language across the app.
              Rows wrap at half the cell width so a heavily-tagged Photo never
              curtains its whole image. Display-only for now; tag/untag editing
              arrives in a later slice. */}
          {photo.tags.length > 0 && (
            <div className="pointer-events-none absolute top-2 left-2 flex max-w-[50%] flex-wrap gap-2.5">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-4 py-1.5 text-sm tracking-wide font-medium backdrop-blur-sm ${theme.border} ${theme.textPrimary}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {/* Drop indicator: a bar on the edge where the dragged block will land —
          the leading edge of the cell it drops before, or the trailing edge of
          the last cell when it drops at the very end. */}
      {insertBefore && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
      )}
      {insertAfterLast && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
      )}
    </figure>
  );
}

interface PhotoGridProps {
  photos: Photo[];
  theme: PhotosTheme;
  /** When true, cells toggle selection instead of opening the viewer. */
  editMode?: boolean;
  /** Ids of currently selected Photos (Edit Mode only). */
  selectedIds?: ReadonlySet<string>;
  /** Toggle a Photo's selection (Edit Mode only). */
  onToggleSelect?: (id: string) => void;
  /**
   * Enable drag-to-reorder (issue #9). Only true in unfiltered Edit Mode: a
   * reorder rewrites Master Order, which is meaningful only over the whole set,
   * so a filtered view (which hides Photos) never offers it.
   */
  reorderable?: boolean;
  /**
   * Commit a drag: move the Photos in `movingIds` so they land before
   * `targetId` (null = at the end). The parent computes the fractional positions
   * and persists them (see lib/reorder).
   */
  onReorder?: (movingIds: string[], targetId: string | null) => void;
}

/** The in-flight drag: which Photos are moving, and where they'll land. */
interface DragState {
  /** The block being dragged, as an id set (for dimming its cells). */
  moving: ReadonlySet<string>;
  /** The Photo the block will land before, or null for the end of the set. */
  before: string | null;
}

/**
 * Responsive masonry that preserves Master Order. The grid has `columnCount`
 * equal-width columns; each Photo spans one to three of them by aspect ratio
 * (3:2 → 2, 21:9 → 3), clamped to what the viewport offers, and spans however
 * many ROW_UNIT rows its rendered height needs. `grid-auto-flow: dense`
 * backfills the gaps a wide Photo would otherwise leave.
 */
export default function PhotoGrid({
  photos,
  theme,
  editMode = false,
  selectedIds,
  onToggleSelect,
  reorderable = false,
  onReorder,
}: PhotoGridProps) {
  const columnCount = useColumnCount();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridWidth = useMeasuredWidth(gridRef);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Live map of each Photo's figure element, keyed by id, so the viewer can
  // measure the cell to expand from (on open) and collapse back into (on close).
  const figureEls = useRef(new Map<string, HTMLElement>());
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  const registerRef = (id: string, el: HTMLElement | null) => {
    if (el) figureEls.current.set(id, el);
    else figureEls.current.delete(id);
  };

  const openPhoto = (photo: Photo, el: HTMLElement) => {
    setOriginRect(el.getBoundingClientRect());
    setOpenIndex(indexById.get(photo.id) ?? 0);
  };

  // Scroll the gallery so the given Photo's cell is centred in view, then return
  // its (now on-screen) rect — the target the viewer collapses the image into.
  const collapseTargetFor = (photoId: string): DOMRect | null => {
    const el = figureEls.current.get(photoId);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    return el.getBoundingClientRect();
  };

  // Begin a drag from `id`. If the grabbed Photo is part of a multi-selection,
  // the whole selection travels as one contiguous block (in Master Order);
  // otherwise just the grabbed Photo moves — grabbing an unselected Photo does
  // not disturb the selection.
  const startDrag = (id: string) => {
    const movingSelection = (selectedIds?.size ?? 0) > 1 && selectedIds?.has(id);
    const moving = movingSelection
      ? new Set(photos.filter((p) => selectedIds!.has(p.id)).map((p) => p.id))
      : new Set([id]);
    setDrag({ moving, before: null });
  };

  // Update the drop point as the cursor moves over a cell. Hovering a cell that
  // is itself being dragged leaves the indicator where it is (you can't drop a
  // block inside itself).
  const hoverDrag = (targetId: string | null) =>
    setDrag((d) => {
      if (!d) return d;
      if (targetId != null && d.moving.has(targetId)) return d;
      return { ...d, before: targetId };
    });

  const dropDrag = () => {
    if (drag) onReorder?.([...drag.moving], drag.before);
    setDrag(null);
  };

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
    // Every Photo occupies a single column, whatever its aspect ratio.
    const span = 1;
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
        {laidOut.map(({ photo, span, rowSpan }, i) => {
          const isLast = i === laidOut.length - 1;
          return (
            <PhotoFigure
              key={photo.id}
              photo={photo}
              nextId={isLast ? null : laidOut[i + 1].photo.id}
              span={span}
              rowSpan={rowSpan}
              editMode={editMode}
              selected={selectedIds?.has(photo.id) ?? false}
              reorderable={reorderable}
              dragging={drag?.moving.has(photo.id) ?? false}
              insertBefore={drag != null && drag.before === photo.id}
              insertAfterLast={drag != null && drag.before === null && isLast}
              theme={theme}
              onOpen={(el) => openPhoto(photo, el)}
              onToggleSelect={(id) => onToggleSelect?.(id)}
              onDragStartCell={startDrag}
              onDragHover={hoverDrag}
              onDropCell={dropDrag}
              onDragEndCell={() => setDrag(null)}
              registerRef={registerRef}
            />
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          theme={theme}
          originRect={originRect}
          collapseTargetFor={collapseTargetFor}
        />
      )}
    </>
  );
}
