import { describe, it, expect } from 'vitest';
import { insertionPositions, reorder } from './reorder';
import type { Photo } from '../types';

// A Photo at a given Master-Order position; the rest of the fields are inert
// here — reorder only ever reads `id` and `position`.
function photo(id: string, position: number): Photo {
  return {
    id,
    url: `${id}.jpg`,
    thumbnailUrl: `${id}-thumb.jpg`,
    width: 1000,
    height: 1000,
    tags: [],
    caption: null,
    alt: null,
    position,
  };
}

describe('insertionPositions', () => {
  it('bisects the gap for a single insertion between two neighbours', () => {
    expect(insertionPositions(10, 20, 1)).toEqual([15]);
  });

  it('spreads several insertions evenly, strictly between the neighbours', () => {
    const [p1, p2] = insertionPositions(10, 20, 2);
    // Thirds of the 10→20 gap, independent of the code's arithmetic.
    expect(p1).toBeCloseTo(13.3333, 3);
    expect(p2).toBeCloseTo(16.6667, 3);
    expect(10 < p1 && p1 < p2 && p2 < 20).toBe(true);
  });

  it('steps below the first Photo when dropping at the front', () => {
    expect(insertionPositions(null, 0, 1)).toEqual([-1]);
    expect(insertionPositions(null, 0, 2)).toEqual([-2, -1]);
  });

  it('steps above the last Photo when dropping at the end', () => {
    expect(insertionPositions(30, null, 1)).toEqual([31]);
    expect(insertionPositions(30, null, 2)).toEqual([31, 32]);
  });

  it('numbers from zero for an otherwise empty set', () => {
    expect(insertionPositions(null, null, 3)).toEqual([0, 1, 2]);
  });

  it('keeps outputs strictly increasing when the neighbours collide', () => {
    // Degenerate gap (equal neighbour positions): still never collapse the block
    // to one value, or a multi-selection would lose its relative order.
    const [p1, p2] = insertionPositions(5, 5, 2);
    expect(p1 < p2).toBe(true);
    expect(p1).toBeGreaterThan(5);
  });
});

describe('reorder', () => {
  const abcd = [photo('a', 0), photo('b', 10), photo('c', 20), photo('d', 30)];

  it('moves a single Photo before the target with a bisected position', () => {
    const { ordered, moved } = reorder(abcd, ['a'], 'd');
    // a lands between c (20) and d (30) → 25; nothing else is renumbered.
    expect(moved).toEqual([{ id: 'a', position: 25 }]);
    expect(ordered.map((p) => p.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(ordered.map((p) => p.position)).toEqual([10, 20, 25, 30]);
  });

  it('moves a single Photo to the end when the target is null', () => {
    const { ordered, moved } = reorder(abcd, ['b'], null);
    expect(moved).toEqual([{ id: 'b', position: 31 }]);
    expect(ordered.map((p) => p.id)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('moves a single Photo to the front', () => {
    const { ordered, moved } = reorder(abcd, ['c'], 'a');
    expect(moved).toEqual([{ id: 'c', position: -1 }]);
    expect(ordered.map((p) => p.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves a contiguous multi-selection as one block, preserving relative order', () => {
    const abcde = [...abcd, photo('e', 40)];
    // Select b and c; pass the ids out of Master Order to prove the block is
    // re-sorted into Master Order before placement.
    const { ordered, moved } = reorder(abcde, ['c', 'b'], 'e');
    expect(moved.map((m) => m.id)).toEqual(['b', 'c']);
    const [bPos, cPos] = moved.map((m) => m.position);
    // Both land in the d(30)→e(40) gap, b still before c.
    expect(30 < bPos && bPos < cPos && cPos < 40).toBe(true);
    expect(ordered.map((p) => p.id)).toEqual(['a', 'd', 'b', 'c', 'e']);
    // Untouched Photos keep their positions.
    expect(ordered.find((p) => p.id === 'a')!.position).toBe(0);
    expect(ordered.find((p) => p.id === 'd')!.position).toBe(30);
  });

  it('is a no-op when the drop target is inside the moving block', () => {
    const { ordered, moved } = reorder(abcd, ['b', 'c'], 'c');
    expect(moved).toEqual([]);
    expect(ordered).toBe(abcd);
  });

  it('is a no-op when nothing is moving', () => {
    const { moved } = reorder(abcd, [], 'a');
    expect(moved).toEqual([]);
  });

  it('is a no-op when a Photo is dropped back into its own slot', () => {
    // Dropping 'b' before 'c' — its existing successor — leaves Master Order
    // unchanged, so nothing should be rewritten or persisted.
    const { ordered, moved } = reorder(abcd, ['b'], 'c');
    expect(moved).toEqual([]);
    expect(ordered).toBe(abcd);
  });
});
