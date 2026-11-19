import { describe, it, expect } from 'vitest';
import { fitWithin, isHeicLike, MAX_EDGE } from './process-image';

describe('fitWithin', () => {
  it('leaves an image already within the box unchanged', () => {
    expect(fitWithin(1600, 900, 2560)).toEqual({ width: 1600, height: 900 });
    expect(fitWithin(2560, 2560, 2560)).toEqual({ width: 2560, height: 2560 });
  });

  it('scales a landscape image down by its long (width) edge', () => {
    expect(fitWithin(5120, 2880, 2560)).toEqual({ width: 2560, height: 1440 });
  });

  it('scales a portrait image down by its long (height) edge', () => {
    expect(fitWithin(2880, 5120, 2560)).toEqual({ width: 1440, height: 2560 });
  });

  it('preserves aspect ratio within rounding', () => {
    const { width, height } = fitWithin(4032, 3024, 2560); // 4:3 phone photo
    expect(width).toBe(2560);
    expect(height).toBe(1920);
    expect(Math.abs(width / height - 4032 / 3024)).toBeLessThan(0.01);
  });

  it('never upscales and never rounds below 1px', () => {
    expect(fitWithin(10, 4, 2560)).toEqual({ width: 10, height: 4 });
    expect(fitWithin(5120, 1, 2560)).toEqual({ width: 2560, height: 1 });
  });

  it('defaults to MAX_EDGE', () => {
    expect(fitWithin(MAX_EDGE * 2, MAX_EDGE * 2)).toEqual({ width: MAX_EDGE, height: MAX_EDGE });
  });
});

describe('isHeicLike', () => {
  it('matches HEIC/HEIF by MIME type', () => {
    expect(isHeicLike({ name: 'x', type: 'image/heic' })).toBe(true);
    expect(isHeicLike({ name: 'x', type: 'image/heif' })).toBe(true);
  });

  it('matches by extension when the MIME type is missing (as phones often send)', () => {
    expect(isHeicLike({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
    expect(isHeicLike({ name: 'IMG_0001.heif', type: '' })).toBe(true);
  });

  it('does not match ordinary web images', () => {
    expect(isHeicLike({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
    expect(isHeicLike({ name: 'photo.png', type: 'image/png' })).toBe(false);
    expect(isHeicLike({ name: 'heiconfig.jpg', type: 'image/jpeg' })).toBe(false);
  });
});
