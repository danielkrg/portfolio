import { describe, it, expect } from 'vitest';
import { deriveOrientation } from './orientation';

// Orientation is derived from dimensions, not stored (GLOSSARY: Orientation).
// Square tolerance is ~2% of the longer side (GLOSSARY: Square).
describe('deriveOrientation', () => {
  it('calls a clearly wider image Landscape', () => {
    expect(deriveOrientation(1600, 900)).toBe('landscape');
  });

  it('calls a clearly taller image Portrait', () => {
    expect(deriveOrientation(900, 1600)).toBe('portrait');
  });

  it('calls an exactly square image Square', () => {
    expect(deriveOrientation(1000, 1000)).toBe('square');
  });

  it('treats a near-square image within 2% as Square', () => {
    // 20/1020 ≈ 1.96% — inside the tolerance
    expect(deriveOrientation(1000, 1020)).toBe('square');
    expect(deriveOrientation(1020, 1000)).toBe('square');
  });

  it('treats an image just outside 2% as Landscape/Portrait', () => {
    // 21/1021 ≈ 2.06% — outside the tolerance
    expect(deriveOrientation(1021, 1000)).toBe('landscape');
    expect(deriveOrientation(1000, 1021)).toBe('portrait');
  });

  it('rejects non-positive dimensions', () => {
    expect(() => deriveOrientation(0, 100)).toThrow();
    expect(() => deriveOrientation(100, -1)).toThrow();
  });
});
