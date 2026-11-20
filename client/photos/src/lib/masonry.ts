import type { Photo } from '../types';

// Aspect-ratio (width / height) thresholds at which a Photo claims more grid
// columns. A 3:2 landscape (1.5) widens to two columns; a 21:9 panorama (2.33)
// spans three. The 1.45 cut sits just below 3:2 so near-3:2 frames still widen,
// while milder landscapes (7:5 = 1.4, 11:8.5 = 1.29) stay a single column.
export const TWO_COLUMN_RATIO = 1.45;
export const THREE_COLUMN_RATIO = 2;

/** Column count by viewport width. Capped at 3 so Photos stay large. */
export function columnsForWidth(width: number): number {
  if (width >= 1024) return 3; // lg+
  if (width >= 640) return 2; // sm
  return 1;
}

/**
 * How many grid columns a Photo wants, from its aspect ratio (GLOSSARY:
 * Orientation). The caller clamps this to the columns actually available, so a
 * three-column panorama still fits a two- or one-column viewport.
 */
export function columnSpan(photo: Photo): number {
  const ratio = photo.width / photo.height;
  if (ratio >= THREE_COLUMN_RATIO) return 3;
  if (ratio >= TWO_COLUMN_RATIO) return 2;
  return 1;
}
