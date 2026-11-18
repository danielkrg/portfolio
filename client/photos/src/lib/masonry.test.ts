import { describe, it, expect } from 'vitest';
import { columnSpan, columnsForWidth } from './masonry';
import type { Photo } from '../types';

function photo(id: string, width: number, height: number): Photo {
  return {
    id,
    url: `https://x/${id}.jpg`,
    thumbnailUrl: `https://x/t/${id}.jpg`,
    width,
    height,
    tags: [],
    caption: null,
    alt: null,
    position: 0,
  };
}

describe('columnsForWidth', () => {
  it('scales column count with viewport width, capped at 3', () => {
    expect(columnsForWidth(500)).toBe(1);
    expect(columnsForWidth(640)).toBe(2);
    expect(columnsForWidth(1024)).toBe(3);
    expect(columnsForWidth(1280)).toBe(3);
    expect(columnsForWidth(2000)).toBe(3);
  });
});

describe('columnSpan (widen by aspect ratio)', () => {
  it('keeps squares, portraits, and mild landscapes to a single column', () => {
    expect(columnSpan(photo('square', 1000, 1000))).toBe(1);
    expect(columnSpan(photo('portrait', 800, 1000))).toBe(1);
    expect(columnSpan(photo('elevenEightHalf', 1100, 850))).toBe(1); // 1.29:1
    expect(columnSpan(photo('sevenFive', 1400, 1000))).toBe(1); // 1.4:1, just under the cut
  });

  it('widens 3:2 and wider landscapes to two columns', () => {
    expect(columnSpan(photo('threeTwo', 1500, 1000))).toBe(2); // 1.5:1
    expect(columnSpan(photo('sixteenNine', 1600, 900))).toBe(2); // 1.78:1
  });

  it('spans panoramas across three columns', () => {
    expect(columnSpan(photo('twentyOneNine', 2100, 900))).toBe(3); // 2.33:1
    expect(columnSpan(photo('exactly2', 2000, 1000))).toBe(3); // 2.0:1 hits the threshold
  });
});
