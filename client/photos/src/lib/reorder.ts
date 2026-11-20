import type { Photo } from '../types';

/**
 * Master-Order reordering with fractional positions.
 *
 * A Photo's place in Master Order is a single `position` number (GLOSSARY:
 * Master Order). Positions are fractional so a move rewrites only the Photos
 * that actually moved: the moved block is dropped into the gap between its new
 * neighbours by taking values *between* their positions, leaving every other
 * Photo's `position` untouched. No global renumbering, so one drag is one (or,
 * for a multi-selection, a few) metadata write(s), not a rewrite of the set.
 */

/** A Photo whose Master-Order `position` has changed and must be persisted. */
export interface Move {
  id: string;
  position: number;
}

/** The outcome of a reorder: the full set in its new order, and the moved subset. */
export interface Reorder {
  /** Every Photo in its new Master Order, moved ones carrying their new position. */
  ordered: Photo[];
  /** Only the Photos whose `position` changed — what the caller persists. */
  moved: Move[];
}

/**
 * `count` strictly-increasing positions for a block dropped into the gap whose
 * neighbours sit at `below` / `above` (either null at an end of the set):
 *  - both present → evenly spaced strictly between them (the gap is bisected for
 *    a single Photo, split into thirds for two, and so on);
 *  - front (no `below`) → the integers just beneath `above`;
 *  - end (no `above`) → the integers just above `below`;
 *  - empty set → 0, 1, 2, …
 * The values ascend, so a block keeps its relative order.
 */
export function insertionPositions(
  below: number | null,
  above: number | null,
  count: number,
): number[] {
  const positions: number[] = [];
  if (below != null && above != null) {
    // A degenerate (zero or inverted) gap — only possible if two neighbours
    // already share a position — would collapse the block to one value; fall
    // back to a unit gap so the outputs stay strictly increasing and the block
    // keeps its relative order. Tie-breaking by id then settles it against the
    // equal-positioned neighbour (see byMasterOrder in the gateway).
    const span = above - below > 0 ? above - below : 1;
    const step = span / (count + 1);
    for (let i = 0; i < count; i++) positions.push(below + step * (i + 1));
  } else if (below != null) {
    for (let i = 0; i < count; i++) positions.push(below + (i + 1));
  } else if (above != null) {
    for (let i = 0; i < count; i++) positions.push(above - (count - i));
  } else {
    for (let i = 0; i < count; i++) positions.push(i);
  }
  return positions;
}

/**
 * Move the Photos in `movingIds` — re-sorted into their current Master Order, so
 * a multi-selection drags as one contiguous block that keeps its relative
 * order — so they land immediately before `targetId` (or at the end when
 * `targetId` is null). Only the moved Photos get new, fractional positions.
 *
 * A no-op (the moved set unchanged, no `moved`) when nothing is moving or the
 * drop target is itself inside the moving block.
 */
export function reorder(
  photos: Photo[],
  movingIds: Iterable<string>,
  targetId: string | null,
): Reorder {
  const movingSet = new Set(movingIds);
  if (movingSet.size === 0 || (targetId != null && movingSet.has(targetId))) {
    return { ordered: photos, moved: [] };
  }

  // The block in current Master Order (preserves relative order) and the rest.
  const moving = photos.filter((p) => movingSet.has(p.id));
  const rest = photos.filter((p) => !movingSet.has(p.id));
  if (moving.length === 0) return { ordered: photos, moved: [] };

  // The drop gap in `rest`: just before the target, or the end if absent.
  const found = rest.findIndex((p) => p.id === targetId);
  const gap = found === -1 ? rest.length : found;

  // Dropping the block back into the slot it already occupies (e.g. a Photo onto
  // its own trailing edge) leaves Master Order unchanged — short-circuit so no
  // position is rewritten and nothing is persisted.
  const unchanged =
    gap >= 0 &&
    photos.length === rest.length + moving.length &&
    rest.slice(0, gap).every((p, i) => photos[i]?.id === p.id) &&
    moving.every((p, i) => photos[gap + i]?.id === p.id);
  if (unchanged) return { ordered: photos, moved: [] };

  const below = gap > 0 ? rest[gap - 1].position : null;
  const above = gap < rest.length ? rest[gap].position : null;
  const positions = insertionPositions(below, above, moving.length);

  const moved: Move[] = moving.map((p, i) => ({ id: p.id, position: positions[i] }));
  const positionById = new Map(moved.map((m) => [m.id, m.position]));
  const repositioned = moving.map((p) => ({ ...p, position: positionById.get(p.id)! }));

  const ordered = [...rest.slice(0, gap), ...repositioned, ...rest.slice(gap)];
  return { ordered, moved };
}
