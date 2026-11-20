import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { suggestTags, resolveTag, withTag, withoutTag } from '../lib/tags';
import type { PhotosTheme } from '../types';

interface TagInputProps {
  /** Existing Tags to autocomplete against and show as chips (the shared
   *  vocabulary when tagging, or the selection's Tags when untagging). */
  vocabulary: string[];
  placeholder: string;
  submitLabel: string;
  /** Style the submit button as a destructive action (Untag's "Remove"). */
  destructive?: boolean;
  /** Commit the staged Tags. Empty means "nothing staged" (for Untag, that is
   *  the "strip all" case; the parent decides). */
  onSubmit: (tags: string[]) => void;
  onCancel: () => void;
  theme: PhotosTheme;
  isDark: boolean;
}

/**
 * The Tag/Untag entry box (issue #10). A multi-select combobox: the vocabulary
 * is shown as chips floating above a single-line box, and the Owner stages as
 * many Tags as they like before committing them in one action.
 *
 * Typing filters the chips — non-matching ones fade out (case-insensitive, so
 * "b" keeps "B&W") — without ever growing the box vertically. Tab completes the
 * box to the highlighted match; pressing Enter on a non-empty box stages that
 * Tag and clears the box (so Tab+Enter picks a suggestion); clicking a chip
 * toggles it. Committing happens only on Enter with an empty box or on the
 * submit button, and applies every staged Tag at once. Esc cancels.
 */
export default function TagInput({
  vocabulary,
  placeholder,
  submitLabel,
  destructive = false,
  onSubmit,
  onCancel,
  theme,
  isDark,
}: TagInputProps) {
  const [value, setValue] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isStaged = (tag: string) => staged.some((s) => s.toLowerCase() === tag.toLowerCase());

  // The chips shown above the box: the vocabulary, plus any staged Tag that is
  // brand-new (typed, not yet in the vocabulary) so the Owner can see it staged.
  const displayTags = useMemo(() => {
    const out = [...vocabulary];
    for (const s of staged) {
      if (!out.some((t) => t.toLowerCase() === s.toLowerCase())) out.push(s);
    }
    return out;
  }, [vocabulary, staged]);

  // Unstaged Tags whose name begins with the typed text — the Tab/arrow targets.
  const suggestions = useMemo(
    () => suggestTags(value, vocabulary).filter((t) => !isStaged(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, vocabulary, staged],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [value]);

  const stageTag = (tag: string) => {
    setStaged((prev) => withTag(prev, tag));
  };

  const toggleChip = (tag: string) => {
    setStaged((prev) => (isStaged(tag) ? withoutTag(prev, tag) : withTag(prev, tag)));
    inputRef.current?.focus();
  };

  // Commit everything staged, folding in whatever is still typed in the box.
  const commit = () => {
    const typed = resolveTag(value, vocabulary);
    onSubmit(typed ? withTag(staged, typed) : staged);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setValue(suggestions[Math.min(active, suggestions.length - 1)]);
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Non-empty box: stage the typed/completed Tag and clear, ready for the
      // next one. Empty box: commit everything staged.
      if (value.trim() !== '') {
        const typed = resolveTag(value, vocabulary);
        if (typed) stageTag(typed);
        setValue('');
      } else {
        commit();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const q = value.trim().toLowerCase();
  const matches = (tag: string) => q === '' || tag.toLowerCase().startsWith(q);
  const visible = (tag: string) => isStaged(tag) || matches(tag);
  const activeTag = suggestions[active];

  const stagedColors = isDark ? 'border-white text-white' : 'border-black text-black';
  const idleHover = isDark ? 'hover:border-white/40' : 'hover:border-black/40';
  const idleColors = `${theme.border} ${theme.textPrimary} ${idleHover}`;
  // A translucent fill (over the border) so chips stay legible against the
  // gallery behind them.
  const chipBg = isDark ? 'bg-black/50' : 'bg-white/70';
  // Ring marks the chip Tab will complete to (the active suggestion).
  const activeRing = isDark ? 'ring-2 ring-inset ring-white/50' : 'ring-2 ring-inset ring-black/40';
  const submitColors = destructive
    ? 'text-red-400 hover:text-red-600'
    : `rounded-full ${theme.textSecondary} ${theme.textHover}`;

  return (
    <div className="relative">
      {/* Chips float above the box so it never grows vertically; the row is
          unclipped (it lives outside the MorphPill). Non-matching, unstaged
          chips collapse + fade out as the Owner types. */}
      {displayTags.length > 0 && (
        <div className="absolute bottom-full left-0 mb-3 flex max-w-[80vw] flex-wrap justify-start animate-fadeInFast">
          {displayTags.map((tag) => {
            const shown = visible(tag);
            const staged = isStaged(tag);
            return (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleChip(tag)}
                aria-pressed={staged}
                className={`inline-flex items-center overflow-hidden whitespace-nowrap rounded-full border text-sm tracking-wide font-medium backdrop-blur-sm transition-all duration-300 cursor-pointer ${chipBg} ${
                  shown
                    ? 'm-1 max-w-[14rem] px-4 py-1.5 opacity-100'
                    : 'm-0 max-w-0 border-transparent px-0 py-1.5 opacity-0 pointer-events-none'
                } ${staged ? stagedColors : idleColors} ${
                  tag === activeTag && !staged ? activeRing : ''
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-3 shadow-lg backdrop-blur ${theme.navBg} ${theme.border}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
          // h-5/leading-5 + border-0 strip the UA input chrome so the box is the
          // same height as the other action-bar states (which have no input).
          className={`h-5 w-36 appearance-none border-0 bg-transparent px-1 py-0 text-sm leading-5 tracking-wide outline-none ${theme.textPrimary}`}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${submitColors}`}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors duration-200 ${theme.textSecondary} ${theme.textHover}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
