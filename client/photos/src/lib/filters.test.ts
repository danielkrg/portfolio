import { describe, it, expect } from 'vitest';
import { collectTags, filterPhotos, nextTagMode, photoMatches } from './filters';
import type { Orientation } from './orientation';
import type { Photo } from '../types';

function photo(id: string, width: number, height: number, tags: string[]): Photo {
  return {
    id,
    url: `${id}.jpg`,
    thumbnailUrl: `${id}-thumb.jpg`,
    width,
    height,
    tags,
    caption: null,
    alt: null,
    position: 0,
  };
}

// A spread of orientations and tags to exercise the predicate.
const land = photo('land', 1600, 900, ['travel', 'city']);
const port = photo('port', 900, 1600, ['travel', 'people']);
const squareNature = photo('sq', 1000, 1000, ['nature']);
const all = [land, port, squareNature];

const noOrientation = new Set<Orientation>();

describe('collectTags', () => {
  it('returns distinct tags sorted alphabetically', () => {
    expect(collectTags(all)).toEqual(['city', 'nature', 'people', 'travel']);
  });

  it('is empty for photos with no tags', () => {
    expect(collectTags([photo('x', 100, 100, [])])).toEqual([]);
  });
});

describe('nextTagMode', () => {
  it('cycles off → include → exclude → off', () => {
    expect(nextTagMode(undefined)).toBe('include');
    expect(nextTagMode('include')).toBe('exclude');
    expect(nextTagMode('exclude')).toBe(undefined);
  });
});

describe('photoMatches / filterPhotos', () => {
  it('passes everything when nothing is selected', () => {
    expect(filterPhotos(all, noOrientation, {})).toEqual(all);
  });

  it('keeps only the selected orientations (OR)', () => {
    const sel = new Set<Orientation>(['landscape', 'square']);
    expect(filterPhotos(all, sel, {})).toEqual([land, squareNature]);
  });

  it('includes photos carrying any included tag (OR)', () => {
    expect(filterPhotos(all, noOrientation, { city: 'include', people: 'include' })).toEqual([
      land,
      port,
    ]);
  });

  it('hides photos carrying an excluded tag', () => {
    expect(filterPhotos(all, noOrientation, { travel: 'exclude' })).toEqual([squareNature]);
  });

  it('applies exclude even when the photo also matches an include', () => {
    // `land` is included via city but excluded via travel → excluded wins.
    expect(photoMatches(land, noOrientation, { city: 'include', travel: 'exclude' })).toBe(false);
  });

  it('combines orientation and tag filters', () => {
    const sel = new Set<Orientation>(['portrait']);
    expect(filterPhotos(all, sel, { travel: 'include' })).toEqual([port]);
  });
});
