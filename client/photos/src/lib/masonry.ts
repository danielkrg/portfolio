import type { Photo } from '../types';

// A Photo wider than this ratio spans the full grid width (panoramas).
export const ULTRA_WIDE_RATIO = 2;

/** Column count by viewport width. Capped at 3 so Photos stay large. */
export function columnsForWidth(width: number): number {
  if (width >= 1024) return 3; // lg+
  if (width >= 640) return 2; // sm
  return 1;
}

export function isUltraWide(photo: Photo): boolean {
  return photo.width / photo.height > ULTRA_WIDE_RATIO;
}

export type Block = { kind: 'wide'; photo: Photo } | { kind: 'run'; photos: Photo[] };

/**
 * Split the Master-Ordered list into full-width panoramas and the runs of
 * normal Photos between them, so a panorama never sits inside a column.
 */
export function toBlocks(photos: Photo[]): Block[] {
  const blocks: Block[] = [];
  let run: Photo[] = [];
  const flush = () => {
    if (run.length) {
      blocks.push({ kind: 'run', photos: run });
      run = [];
    }
  };
  for (const photo of photos) {
    if (isUltraWide(photo)) {
      flush();
      blocks.push({ kind: 'wide', photo });
    } else {
      run.push(photo);
    }
  }
  flush();
  return blocks;
}

/**
 * Row-major distribution: Photo j of the run goes to column j % columnCount, so
 * the top row reads left-to-right in Master Order, then the next row, etc.
 */
export function toColumns(photos: Photo[], columnCount: number): Photo[][] {
  const columns: Photo[][] = Array.from({ length: columnCount }, () => []);
  photos.forEach((photo, j) => columns[j % columnCount].push(photo));
  return columns;
}
