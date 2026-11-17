import { describe, it, expect } from 'vitest';
import { columnsForWidth, isUltraWide, toBlocks, toColumns } from './masonry';
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

describe('isUltraWide', () => {
  it('flags Photos wider than 2:1', () => {
    expect(isUltraWide(photo('pano', 2200, 1000))).toBe(true);
    expect(isUltraWide(photo('wide', 1800, 1000))).toBe(false); // 1.8:1
    expect(isUltraWide(photo('exactly2', 2000, 1000))).toBe(false); // not strictly > 2
  });
});

describe('toColumns (row-major Master Order)', () => {
  it('lays the top row left-to-right in order, then the next row', () => {
    const photos = ['a', 'b', 'c', 'd', 'e'].map((id) => photo(id, 1000, 1000));
    const columns = toColumns(photos, 3);

    // Top row reads a,b,c across; d,e begin the next row under a,b.
    expect(columns.map((col) => col.map((p) => p.id))).toEqual([
      ['a', 'd'],
      ['b', 'e'],
      ['c'],
    ]);
  });
});

describe('toBlocks (ultra-wide segmentation)', () => {
  it('breaks the run at each panorama so it never sits inside a column', () => {
    const photos = [
      photo('a', 1000, 1000),
      photo('b', 1000, 1000),
      photo('pano', 3000, 1000),
      photo('c', 1000, 1000),
    ];

    expect(toBlocks(photos)).toEqual([
      { kind: 'run', photos: [photos[0], photos[1]] },
      { kind: 'wide', photo: photos[2] },
      { kind: 'run', photos: [photos[3]] },
    ]);
  });
});
