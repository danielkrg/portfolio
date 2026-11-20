import { describe, it, expect } from 'vitest';
import { suggestTags, resolveTag, withTag, withoutTag, sameTagSet } from './tags';

describe('suggestTags (autocomplete)', () => {
  const vocab = ['B&W', 'Blue', 'Nature', 'Street'];

  it('matches existing tags case-insensitively by prefix', () => {
    // "b" surfaces both B-tags regardless of case (the ticket's "b" → "B&W").
    expect(suggestTags('b', vocab)).toEqual(['B&W', 'Blue']);
  });

  it('is case-insensitive on the query too', () => {
    expect(suggestTags('BL', vocab)).toEqual(['Blue']);
  });

  it('returns nothing for blank input', () => {
    expect(suggestTags('', vocab)).toEqual([]);
    expect(suggestTags('   ', vocab)).toEqual([]);
  });

  it('returns nothing when no tag starts with the query', () => {
    expect(suggestTags('z', vocab)).toEqual([]);
  });
});

describe('resolveTag (canonical casing / new by first use)', () => {
  const vocab = ['B&W', 'Nature'];

  it('adopts an existing tag’s stored casing', () => {
    expect(resolveTag('b&w', vocab)).toBe('B&W');
    expect(resolveTag('NATURE', vocab)).toBe('Nature');
  });

  it('keeps a brand-new tag as typed (trimmed)', () => {
    expect(resolveTag('  Mountains  ', vocab)).toBe('Mountains');
  });

  it('is null for blank input (nothing to add)', () => {
    expect(resolveTag('', vocab)).toBeNull();
    expect(resolveTag('   ', vocab)).toBeNull();
  });
});

describe('withTag / withoutTag (case-insensitive set edits)', () => {
  it('adds a tag not already present', () => {
    expect(withTag(['Nature'], 'B&W')).toEqual(['Nature', 'B&W']);
  });

  it('does not duplicate a tag already present (case-insensitively)', () => {
    expect(withTag(['B&W'], 'b&w')).toEqual(['B&W']);
  });

  it('removes every case-insensitive match', () => {
    expect(withoutTag(['B&W', 'Nature'], 'b&w')).toEqual(['Nature']);
  });

  it('is a no-op when the tag is absent', () => {
    expect(withoutTag(['Nature'], 'B&W')).toEqual(['Nature']);
  });
});

describe('sameTagSet (no-op detection)', () => {
  it('is true for identical lists', () => {
    expect(sameTagSet(['B&W', 'Nature'], ['B&W', 'Nature'])).toBe(true);
    expect(sameTagSet([], [])).toBe(true);
  });

  it('is false when membership or length differs', () => {
    expect(sameTagSet(['B&W'], ['B&W', 'Nature'])).toBe(false);
    expect(sameTagSet(['Nature'], ['B&W'])).toBe(false);
  });

  it('treats a case difference as a real change (exact compare)', () => {
    expect(sameTagSet(['B&W'], ['b&w'])).toBe(false);
  });
});
