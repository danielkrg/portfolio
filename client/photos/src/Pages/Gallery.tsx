import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowUpOnSquareIcon, ChevronDownIcon, PencilIcon } from '@heroicons/react/24/outline';
import PhotoGrid from '../components/PhotoGrid';
import FilterBar from '../components/FilterBar';
import MorphPill from '../components/MorphPill';
import TagInput from '../components/TagInput';
import { collectTags, filterPhotos, nextTagMode, type TagMode } from '../lib/filters';
import { withTag, withoutTag, sameTagSet } from '../lib/tags';
import { reorder, type Move } from '../lib/reorder';
import { uploadPhoto } from '../lib/upload';
import type { Orientation } from '../lib/orientation';
import type { Photo, PhotosAppProps } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; photos: Photo[] }
  | { status: 'error' };

/**
 * The gallery. Fetches Photos from /api/photos (Cloudinary-backed, ADR-0001)
 * and renders them as a responsive masonry in Master Order, in the portfolio's
 * light/dark theme with the global custom cursor. The full-screen cover is the
 * landing; the grid loads underneath it.
 *
 * Public by default. When the Owner's session cookie is present (ADR-0002) an
 * Edit toggle appears top-right of the header: it turns the grid into a
 * multi-select surface for deleting Photos (and their underlying Cloudinary
 * assets). Logged out, none of this renders.
 */
export default function Gallery({ isDark, theme, onExit, coverUrl }: PhotosAppProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [showArrow, setShowArrow] = useState(true);
  const [orientations, setOrientations] = useState<ReadonlySet<Orientation>>(new Set());
  const [tagModes, setTagModes] = useState<Record<string, TagMode>>({});
  // Owner curation state (ADR-0002). `isOwner` is restored from the httpOnly
  // session cookie on mount; logged out, no Edit affordance renders at all.
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // The Edit action bar is a small state machine: 'select' lists the actions,
  // 'confirm' arms the (irreversible) delete, and 'tag'/'untag' open the Tag
  // entry box (issue #10). Only one is active at a time.
  const [barMode, setBarMode] = useState<'select' | 'confirm' | 'tag' | 'untag'>('select');
  const [deleting, setDeleting] = useState(false);
  // Upload state (issue #8). `uploading` counts files still in flight in the
  // current action; `uploadError` surfaces a partial failure briefly.
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverRef = useRef<HTMLElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleOrientation = (orientation: Orientation) =>
    setOrientations((prev) => {
      const next = new Set(prev);
      if (next.has(orientation)) next.delete(orientation);
      else next.add(orientation);
      return next;
    });

  const toggleTag = (tag: string) =>
    setTagModes((prev) => {
      const mode = nextTagMode(prev[tag]);
      const next = { ...prev };
      if (mode) next[tag] = mode;
      else delete next[tag];
      return next;
    });

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitEditMode = () => {
    setEditMode(false);
    setSelected(new Set());
    setBarMode('select');
  };

  const toggleEditMode = () => (editMode ? exitEditMode() : setEditMode(true));

  // Delete the current selection: remove each underlying Cloudinary asset via
  // the gateway (DELETE /api/photos/:id, Owner-gated), then drop the ones that
  // succeeded from the grid. Partial failures keep their Photos and selection.
  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDeleting(true);
    const outcomes = await Promise.all(
      ids.map((id) =>
        fetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
          .then((res) => res.ok)
          .catch(() => false),
      ),
    );
    const removed = new Set(ids.filter((_, i) => outcomes[i]));
    setLoad((prev) =>
      prev.status === 'ready'
        ? { status: 'ready', photos: prev.photos.filter((p) => !removed.has(p.id)) }
        : prev,
    );
    setSelected((prev) => new Set([...prev].filter((id) => !removed.has(id))));
    setBarMode('select');
    setDeleting(false);
  };

  // Persist a tag/untag edit (issue #10): PUT each Photo's new full Tag set
  // (Owner-gated). The client only writes the Photos whose set actually changed,
  // so untagging a Tag a Photo doesn't carry costs no request. The grid updates
  // optimistically — which refreshes the in-use Tag vocabulary and so the filter
  // list — and the selection is left intact. If any write fails the local tags
  // may diverge from the server, so resync from the API to be safe.
  const writeTags = async (targets: { id: string; tags: string[] }[]) => {
    const byId = new Map(allPhotos.map((p) => [p.id, p]));
    const changed = targets.filter((t) => {
      const photo = byId.get(t.id);
      return photo != null && !sameTagSet(photo.tags, t.tags);
    });
    setBarMode('select');
    if (changed.length === 0) return;
    const changedTags = new Map(changed.map((c) => [c.id, c.tags]));
    setLoad((prev) =>
      prev.status === 'ready'
        ? {
            status: 'ready',
            photos: prev.photos.map((p) =>
              changedTags.has(p.id) ? { ...p, tags: changedTags.get(p.id)! } : p,
            ),
          }
        : prev,
    );
    const results = await Promise.all(
      changed.map((c) =>
        fetch(`/api/photos/${encodeURIComponent(c.id)}/tags`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: c.tags }),
        })
          .then((res) => res.ok)
          .catch(() => false),
      ),
    );
    if (results.some((ok) => !ok)) void loadPhotos();
  };

  // Add the staged Tags to every selected Photo (TagInput canonicalizes casing
  // and creates new Tags by first use). Photos that already carry a Tag are left
  // unchanged. Nothing staged is a no-op.
  const applyTag = (tags: string[]) => {
    if (tags.length === 0) {
      setBarMode('select');
      return;
    }
    void writeTags(
      selectedPhotos.map((p) => ({ id: p.id, tags: tags.reduce(withTag, p.tags) })),
    );
  };

  // Remove the staged Tags from every selected Photo — or, when nothing is
  // staged, strip all Tags from the selection (the blank-entry case). Matching
  // is case-insensitive, so a Photo that doesn't carry a Tag is simply untouched.
  const applyUntag = (tags: string[]) => {
    const target =
      tags.length === 0
        ? selectedPhotos.map((p) => ({ id: p.id, tags: [] }))
        : selectedPhotos.map((p) => ({ id: p.id, tags: tags.reduce(withoutTag, p.tags) }));
    void writeTags(target);
  };

  // Persist a reorder (issue #9): write each moved Photo's new fractional
  // position to Cloudinary (PATCH, Owner-gated). Fractional positions mean only
  // the moved Photos are touched. If any write fails the local order may diverge
  // from what the server stored, so resync from the API to be safe.
  const persistPositions = async (moved: Move[]) => {
    const results = await Promise.all(
      moved.map((m) =>
        fetch(`/api/photos/${encodeURIComponent(m.id)}/position`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: m.position }),
        })
          .then((res) => res.ok)
          .catch(() => false),
      ),
    );
    if (results.some((ok) => !ok)) void loadPhotos();
  };

  // Commit a drag-reorder: move `movingIds` before `targetId` (null = end),
  // applying fractional positions to the moved Photos only (lib/reorder). The
  // grid updates optimistically; the new positions are persisted in the
  // background. Reordering acts on the whole set, and is only ever invoked from
  // the unfiltered view, so Master Order stays canonical.
  const handleReorder = (movingIds: string[], targetId: string | null) => {
    if (load.status !== 'ready') return;
    const { ordered, moved } = reorder(load.photos, movingIds, targetId);
    if (moved.length === 0) return;
    setLoad({ status: 'ready', photos: ordered });
    void persistPositions(moved);
  };

  // Seed a freshly uploaded Photo at the front of the grid: new Photos are
  // newest-first in Master Order (issue #8), and the array order is the display
  // order, so prepending puts the latest upload on top.
  const prependPhoto = (photo: Photo) =>
    setLoad((prev) =>
      prev.status === 'ready'
        ? { status: 'ready', photos: [photo, ...prev.photos] }
        : { status: 'ready', photos: [photo] },
    );

  // Process and upload every picked file (one action, one or many files). Each
  // is downscaled, EXIF-stripped and HEIC-converted in the browser before it is
  // sent (see lib/upload). Successes stream into the grid as they land; failures
  // are counted and reported without disturbing the Photos that did upload.
  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? [...fileList] : [];
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(files.length);
    let failures = 0;
    for (const file of files) {
      try {
        prependPhoto(await uploadPhoto(file));
      } catch (err) {
        console.error('Upload failed:', err);
        failures += 1;
      }
      setUploading((n) => n - 1);
    }
    if (failures > 0) {
      setUploadError(`${failures} of ${files.length} upload${files.length === 1 ? '' : 's'} failed.`);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
    e.target.value = ''; // let the same file be re-picked after a failure
  };

  // Restore Owner state from the session cookie (httpOnly, unreadable by JS).
  useEffect(() => {
    let active = true;
    fetch('/api/photos/session', { credentials: 'include' })
      .then((res) => {
        if (active) setIsOwner(res.ok);
      })
      .catch(() => {
        if (active) setIsOwner(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load (or reload) the gallery from the API. Reused on mount and to resync
  // after a reorder whose persistence partially failed, so the grid always ends
  // up matching the Master Order the server actually stored.
  const loadPhotos = async () => {
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { photos?: Photo[] } = await res.json();
      setLoad({ status: 'ready', photos: Array.isArray(data.photos) ? data.photos : [] });
    } catch {
      setLoad({ status: 'error' });
    }
  };

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The jump arrow lives on the cover; hide it once the visitor scrolls the
  // cover mostly out of view (i.e. once they're into the gallery).
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowArrow(entry.isIntersecting && entry.intersectionRatio >= 0.75),
      { threshold: [0, 0.75, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Clear a partial-upload notice after a few seconds so it doesn't linger.
  useEffect(() => {
    if (!uploadError) return;
    const timer = setTimeout(() => setUploadError(null), 6000);
    return () => clearTimeout(timer);
  }, [uploadError]);

  // Keyboard shortcut: `e` toggles Edit Mode, mirroring the Edit button — so
  // only for the Owner and only once there are Photos to curate. Ignored while
  // typing or with a modifier held, so it never fights a real text field or an
  // OS/browser shortcut.
  const hasPhotos = load.status === 'ready' && load.photos.length > 0;
  useEffect(() => {
    if (!isOwner || !hasPhotos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      toggleEditMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, hasPhotos, editMode]);

  const jumpToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const allPhotos = load.status === 'ready' ? load.photos : [];
  const allTags = useMemo(() => collectTags(allPhotos), [allPhotos]);
  const visiblePhotos = useMemo(
    () => filterPhotos(allPhotos, orientations, tagModes),
    [allPhotos, orientations, tagModes],
  );
  // The selection and its Tags: `selectionTags` is the untag autocomplete
  // vocabulary (only Tags actually on the selected Photos).
  const selectedPhotos = useMemo(
    () => allPhotos.filter((p) => selected.has(p.id)),
    [allPhotos, selected],
  );
  const selectionTags = useMemo(() => collectTags(selectedPhotos), [selectedPhotos]);

  // Keep the tag filters in step with the in-use vocabulary: once no Photo
  // carries a Tag (after an untag), drop any filter still keyed to it so a stale
  // 'include' can't hide the whole grid. The pill itself disappears because
  // FilterBar renders from `allTags`.
  useEffect(() => {
    setTagModes((prev) => {
      const kept = Object.entries(prev).filter(([tag]) => allTags.includes(tag));
      return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept);
    });
  }, [allTags]);

  // A filtered view hides Photos, so it can't express a reorder of the whole
  // set; drag-reorder is therefore offered only in unfiltered Edit Mode (#9).
  const filtersActive = orientations.size > 0 || Object.keys(tagModes).length > 0;
  const reorderable = isOwner && editMode && !filtersActive;

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      {/* Exit: fixed to the top-left corner of the viewport so it stays put as
          the visitor scrolls. Position and size mirror the StarSync home page. */}
      <div className="absolute top-4 left-4 z-50 animate-fadeInMed">
        <button
          onClick={onExit}
          className={`font-semibold py-2 px-4 rounded-full transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
        >
          Exit
        </button>
      </div>

      {/* Landing cover: full-screen backdrop with placeholder copy on the right.
          The gallery renders underneath, so its images load while the visitor
          is still on the cover. */}
      <section ref={coverRef} className="relative h-screen w-full animate-fadeInMed">
        <div className="absolute inset-0 overflow-hidden">
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-end mr-10 p-8 sm:p-16">
            <div className="max-w-sm text-left text-white">
              <h2 className="font-bold text-4xl md:text-5xl mb-4">My Journey</h2>
              <p className="text-white/80">
                Photography is my favourite mean of creative expression. 
              </p>
            </div>
          </div>
        </div>

        {/* Jump-to-gallery arrow; fades out once the cover is scrolled away. */}
        <button
          onClick={jumpToGallery}
          aria-label="Jump to gallery"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-white/80 hover:text-white transition-opacity duration-300 cursor-pointer"
          style={{ opacity: showArrow ? 1 : 0, pointerEvents: showArrow ? 'auto' : 'none' }}
        >
          <ChevronDownIcon className="h-9 w-9 animate-bounce" />
        </button>
      </section>

      <div ref={galleryRef} className="relative px-2 pt-30 pb-30 animate-fadeInMed">
        {/* Owner controls: top-right of the header, mirroring the orientation
            filters below-right (ADR-0002). Rendered only when authenticated, so
            logged out there is no hint Edit Mode exists. Upload sits to the left
            of the Edit toggle and stays available even on an empty gallery, so
            the Owner can seed the first Photos; the Edit toggle only appears once
            there are Photos to curate. Visible in filtered views too — only
            drag-reorder is restricted to the unfiltered view. */}
        {isOwner && load.status === 'ready' && (
          <div className="absolute right-5 top-5 z-40 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={onFileInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading > 0}
              aria-label={uploading > 0 ? `Uploading ${uploading} photo${uploading === 1 ? '' : 's'}` : 'Upload photos'}
              title={uploading > 0 ? 'Uploading…' : 'Upload photos'}
              className={`p-2 rounded-md transition-colors duration-300 cursor-pointer disabled:cursor-default ${theme.textSubtle} ${theme.textHover}`}
            >
              {uploading > 0 ? (
                <span
                  className="block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUpOnSquareIcon className="h-6 w-6" />
              )}
            </button>
            {allPhotos.length > 0 && (
              <button
                type="button"
                onClick={toggleEditMode}
                aria-pressed={editMode}
                aria-label={editMode ? 'Exit edit mode' : 'Edit gallery'}
                title={editMode ? 'Exit edit mode' : 'Edit gallery'}
                className={`p-2 rounded-md transition-colors duration-300 cursor-pointer ${
                  editMode
                    ? isDark
                      ? 'text-white'
                      : 'text-black'
                    : `${theme.textSubtle} ${theme.textHover}`
                }`}
              >
                <PencilIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        {/* Partial-upload notice, just below the controls; auto-clears. */}
        {uploadError && (
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className={`absolute right-5 top-16 z-40 rounded-full border px-4 py-1.5 text-sm shadow-lg backdrop-blur cursor-pointer animate-fadeInFast ${theme.navBg} ${theme.border} text-red-400`}
          >
            {uploadError}
          </button>
        )}

        {/* Header: the centred Gallery title flanked by thin rules that run to
            both screen edges (within the gallery's side margins) and sit on the
            title's vertical centre. (Exit lives fixed at the top-left.) */}
        <div className="flex items-center gap-6 pb-5">
          <div className="h-px flex-1 bg-white/15" />
          <h1 className={`text-7xl font-extrabold tracking-wide md:text-8xl ${theme.textPrimary}`}>
            Gallery
          </h1>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {/* Filter row: tag filters on the left (wrapping at mid-screen),
            orientation filters on the right, aligned to the last tag row. */}
        {load.status === 'ready' && allPhotos.length > 0 && (
          <div className="mt-10 mb-4">
            <FilterBar
              tags={allTags}
              tagModes={tagModes}
              onToggleTag={toggleTag}
              orientations={orientations}
              onToggleOrientation={toggleOrientation}
              theme={theme}
              isDark={isDark}
            />
          </div>
        )}

        {load.status === 'loading' && (
          <p className={theme.textSecondary}>Loading gallery…</p>
        )}
        {load.status === 'error' && (
          <p className={theme.textSecondary}>Gallery unavailable — is the API running?</p>
        )}
        {load.status === 'ready' && load.photos.length === 0 && (
          <p className={theme.textSecondary}>No photos yet — the gallery is coming soon.</p>
        )}
        {load.status === 'ready' && load.photos.length > 0 && visiblePhotos.length === 0 && (
          <p className={theme.textSecondary}>No photos match the current filters.</p>
        )}
        {load.status === 'ready' && visiblePhotos.length > 0 && (
          <PhotoGrid
            photos={visiblePhotos}
            theme={theme}
            editMode={editMode}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            reorderable={reorderable}
            onReorder={handleReorder}
          />
        )}
      </div>

      {/* Edit Mode action bar: fixed, bottom-centre, shown once something is
          selected. 'select' lists the actions (the pill morphs between select
          and the Delete confirm); Tag/Untag swap in their own entry box, which
          floats the Tag chips above it unclipped (issue #10), applies on commit
          and keeps the selection; Delete arms a confirm step, since removing the
          Cloudinary asset can't be undone. */}
      {editMode && selected.size > 0 && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-fadeInMed">
          {barMode === 'tag' ? (
            <TagInput
              vocabulary={allTags}
              placeholder="Add tag"
              submitLabel="Add"
              onSubmit={applyTag}
              onCancel={() => setBarMode('select')}
              theme={theme}
              isDark={isDark}
            />
          ) : barMode === 'untag' ? (
            <TagInput
              vocabulary={selectionTags}
              placeholder="Remove tag(s)"
              submitLabel="Remove"
              destructive
              onSubmit={applyUntag}
              onCancel={() => setBarMode('select')}
              theme={theme}
              isDark={isDark}
            />
          ) : (
            <MorphPill className={`rounded-full border shadow-lg backdrop-blur ${theme.navBg} ${theme.border}`}>
              <div key={barMode} className="flex items-center gap-4 px-5 py-3 animate-fadeInFast">
                {barMode === 'confirm' ? (
                  <>
                    <span className={`text-sm ${theme.textPrimary}`}>
                      Delete {selected.size} photo{selected.size === 1 ? '' : 's'}? This can’t be undone.
                    </span>
                    <button
                      type="button"
                      onClick={() => setBarMode('select')}
                      disabled={deleting}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${theme.textSecondary} ${theme.textHover} disabled:opacity-40`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelected}
                      disabled={deleting}
                      className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 text-red-400 hover:text-red-600 disabled:opacity-40`}
                    >
                      {deleting ? 'Deleting…' : 'Confirm'}
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`text-sm ${theme.textPrimary}`}>{selected.size} Selected</span>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${theme.textSecondary} ${theme.textHover}`}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarMode('tag')}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${theme.textSecondary} ${theme.textHover}`}
                    >
                      Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarMode('untag')}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${theme.textSecondary} ${theme.textHover}`}
                    >
                      Untag
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarMode('confirm')}
                      className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 text-red-400 hover:text-red-600`}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </MorphPill>
          )}
        </div>
      )}
    </div>
  );
}
