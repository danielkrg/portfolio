import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
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
 * The Tag/Untag entry box (issue #10). A multi-select combobox that renders as
 * inline children of the shared Edit action-bar pill (so it morphs between
 * states and matches their height), with the vocabulary shown as chips.
 *
 * The chips float above the bar via a portal: the pill is `overflow-hidden` for
 * its size morph, so anything positioned above it would be clipped — the portal
 * pins the chips to the bar's top edge instead, keeping the box a single line.
 *
 * Typing filters the chips — non-matching ones fade/collapse (case-insensitive,
 * so "b" keeps "B&W"). Tab completes the box to the highlighted match; Enter on
 * a non-empty box stages that Tag and clears the box (Tab+Enter picks a
 * suggestion); clicking a chip toggles it. Committing — every staged Tag at once
 * — happens only on Enter with an empty box or via the submit button. Esc cancels.
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
  const [anchor, setAnchor] = useState<{ left: number; bottom: number; width: number } | null>(
    null,
  );
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

  // Keep the portaled chip row pinned to the bar's top-left edge. The bar is the
  // `[data-actionbar]` wrapper; it morphs width (centred), so its left edge
  // moves — a ResizeObserver tracks that so the chips follow it.
  useLayoutEffect(() => {
    const bar = inputRef.current?.closest('[data-actionbar]') as HTMLElement | null;
    if (!bar) return;
    const update = () => {
      const rect = bar.getBoundingClientRect();
      setAnchor({ left: rect.left, bottom: window.innerHeight - rect.top + 12, width: rect.width });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const stageTag = (tag: string) => setStaged((prev) => withTag(prev, tag));

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
    <>
      {anchor != null &&
        displayTags.length > 0 &&
        createPortal(
          <div
            // Cap the row at 110% of the box so chips wrap to a new line once
            // they'd run more than 10% past it, rather than trailing off to the
            // side. Clamped to the viewport so it can never overflow the screen.
            style={{
              position: 'fixed',
              left: anchor.left,
              bottom: anchor.bottom,
              maxWidth: `min(${anchor.width * 1.1}px, 96vw)`,
            }}
            className="z-50 flex flex-wrap justify-start animate-fadeInFast"
          >
            {displayTags.map((tag) => {
              const shown = visible(tag);
              const stagedTag = isStaged(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleChip(tag)}
                  aria-pressed={stagedTag}
                  className={`inline-flex items-center overflow-hidden whitespace-nowrap rounded-full border text-sm tracking-wide font-medium backdrop-blur-sm transition-all duration-300 cursor-pointer ${chipBg} ${
                    shown
                      ? 'm-1 max-w-[14rem] px-4 py-1.5 opacity-100'
                      : 'm-0 max-w-0 border-transparent px-0 py-1.5 opacity-0 pointer-events-none'
                  } ${stagedTag ? stagedColors : idleColors} ${
                    tag === activeTag && !stagedTag ? activeRing : ''
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

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
        // h-5/leading-5 + border-0 strip the UA input chrome so the row is the
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
    </>
  );
}
