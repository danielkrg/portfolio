import { deriveOrientation, type Orientation } from './orientation';
import type { Photo } from '../types';

/**
 * A tag filter is tri-state: absent (off, ignored), 'include' (the Photo must
 * carry at least one included tag), or 'exclude' (the Photo is hidden if it
 * carries this tag). Orientation filters are a simple on/off set.
 */
export type TagMode = 'include' | 'exclude';

/** The three visual/behavioural states a tag pill cycles through, in order. */
const TAG_CYCLE: (TagMode | undefined)[] = [undefined, 'include', 'exclude'];

/** Advance a tag one step around off → include → exclude → off. */
export function nextTagMode(current: TagMode | undefined): TagMode | undefined {
  const i = TAG_CYCLE.indexOf(current);
  return TAG_CYCLE[(i + 1) % TAG_CYCLE.length];
}

/** Every distinct tag across the given Photos, sorted alphabetically (locale-aware). */
export function collectTags(photos: Photo[]): string[] {
  const set = new Set<string>();
  for (const photo of photos) {
    for (const tag of photo.tags) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Whether a Photo survives the active filters:
 *  - Orientation: if any orientation is selected, the Photo's must be among them.
 *  - Include tags: if any are included, the Photo must carry at least one.
 *  - Exclude tags: the Photo must carry none of them.
 * With nothing selected everything passes.
 */
export function photoMatches(
  photo: Photo,
  orientations: ReadonlySet<Orientation>,
  tagModes: Readonly<Record<string, TagMode>>,
): boolean {
  if (orientations.size > 0) {
    const orientation = deriveOrientation(photo.width, photo.height);
    if (!orientations.has(orientation)) return false;
  }

  const included: string[] = [];
  const excluded: string[] = [];
  for (const [tag, mode] of Object.entries(tagModes)) {
    if (mode === 'include') included.push(tag);
    else if (mode === 'exclude') excluded.push(tag);
  }

  if (excluded.some((tag) => photo.tags.includes(tag))) return false;
  if (included.length > 0 && !included.some((tag) => photo.tags.includes(tag))) return false;

  return true;
}

/** The Photos that pass the active filters, in their original order. */
export function filterPhotos(
  photos: Photo[],
  orientations: ReadonlySet<Orientation>,
  tagModes: Readonly<Record<string, TagMode>>,
): Photo[] {
  return photos.filter((photo) => photoMatches(photo, orientations, tagModes));
}
