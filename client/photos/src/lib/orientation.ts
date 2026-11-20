export type Orientation = 'landscape' | 'portrait' | 'square';

/** A Photo reads as Square when its sides are equal within this fraction of the longer side. */
export const SQUARE_TOLERANCE = 0.02;

/**
 * Derive a Photo's Orientation from its pixel dimensions (GLOSSARY: Orientation).
 * Near-square images within SQUARE_TOLERANCE of the longer side read as Square.
 */
export function deriveOrientation(width: number, height: number): Orientation {
  if (!(width > 0) || !(height > 0)) {
    throw new Error(`Invalid dimensions: ${width}x${height}`);
  }

  const longerSide = Math.max(width, height);
  if (Math.abs(width - height) <= SQUARE_TOLERANCE * longerSide) {
    return 'square';
  }
  return width > height ? 'landscape' : 'portrait';
}
