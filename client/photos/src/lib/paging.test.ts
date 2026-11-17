import { describe, it, expect } from 'vitest';
import { stepIndex } from './paging';

describe('stepIndex', () => {
  it('moves forward and back within bounds', () => {
    expect(stepIndex(0, 1, 5)).toBe(1);
    expect(stepIndex(3, -1, 5)).toBe(2);
  });

  it('wraps past the end to the start and vice versa', () => {
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(0, -1, 5)).toBe(4);
  });

  it('stays put with a single item', () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });

  it('handles deltas larger than the length', () => {
    expect(stepIndex(0, 7, 5)).toBe(2);
    expect(stepIndex(0, -7, 5)).toBe(3);
  });

  it('is safe on an empty set', () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});
