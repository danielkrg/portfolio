/**
 * Tag vocabulary helpers for the Owner's Tag/Untag editing (issue #10). Pure and
 * case-insensitive throughout: Tags are a single shared vocabulary (GLOSSARY:
 * Tag), so "B&W" and "b&w" are the same Tag, and the stored casing is canonical.
 * The grid and FilterBar derive the in-use vocabulary from the Photos
 * themselves, so these functions never touch a separate registry.
 */

/** Case-insensitive equality for Tag names. */
function sameTag(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Existing Tags whose name begins with `input` (case-insensitive), in the
 * vocabulary's given order. Blank input yields no suggestions. Drives the
 * Tag/Untag autocomplete: typing "b" surfaces "B&W".
 */
export function suggestTags(input: string, vocabulary: string[]): string[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  return vocabulary.filter((tag) => tag.toLowerCase().startsWith(q));
}

/**
 * Canonicalize a typed Tag against the vocabulary. If it case-insensitively
 * matches an existing Tag, return that Tag's stored casing (so "b&w" becomes
 * "B&W" and the vocabulary doesn't fork); otherwise return the trimmed input as
 * a brand-new Tag, created by first use. Blank input yields null (nothing to add).
 */
export function resolveTag(input: string, vocabulary: string[]): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return vocabulary.find((tag) => sameTag(tag, trimmed)) ?? trimmed;
}

/** `tags` with `tag` appended, unless it is already present (case-insensitively). */
export function withTag(tags: string[], tag: string): string[] {
  return tags.some((t) => sameTag(t, tag)) ? tags : [...tags, tag];
}

/** `tags` with every case-insensitive match of `tag` removed. */
export function withoutTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => !sameTag(t, tag));
}

/**
 * Whether two Tag lists are identical in order. The transforms above preserve
 * order, so a positional compare is enough to tell a real edit from a no-op.
 * This is an exact compare (not case-insensitive): the inputs are already
 * canonical Tags read back from the Photos, so any case difference is a genuine
 * change worth persisting.
 */
export function sameTagSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, i) => tag === b[i]);
}
