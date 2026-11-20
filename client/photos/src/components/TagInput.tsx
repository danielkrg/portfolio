import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { suggestTags } from '../lib/tags';
import type { PhotosTheme } from '../types';

interface TagInputProps {
  /** Existing Tags to autocomplete against (the shared vocabulary, or the
   *  selection's Tags when untagging). */
  vocabulary: string[];
  placeholder: string;
  submitLabel: string;
  /** Allow committing an empty value (untag's "strip all Tags"). */
  allowEmpty?: boolean;
  /** Commit the (raw) typed value; the parent canonicalizes casing. */
  onSubmit: (value: string) => void;
  onCancel: () => void;
  theme: PhotosTheme;
  isDark: boolean;
}

/**
 * A small combobox for Tag/Untag (issue #10). Type a Tag name and it
 * autocompletes against `vocabulary` case-insensitively ("b" surfaces "B&W");
 * Tab completes the input to the highlighted suggestion, ↑/↓ move the
 * highlight, Enter commits, Esc cancels. Clicking a suggestion commits it
 * directly. There is no confirmation step — committing applies immediately and
 * the parent keeps the selection intact.
 */
export default function TagInput({
  vocabulary,
  placeholder,
  submitLabel,
  allowEmpty = false,
  onSubmit,
  onCancel,
  theme,
  isDark,
}: TagInputProps) {
  const [value, setValue] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(() => suggestTags(value, vocabulary), [value, vocabulary]);

  // Focus on mount so the Owner can type straight away, and keep the highlight
  // in range as the suggestion list shrinks/grows under the cursor.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [value]);

  const canSubmit = allowEmpty || value.trim() !== '';

  const commit = (v: string) => {
    if (!allowEmpty && v.trim() === '') return;
    onSubmit(v);
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
      commit(value);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const highlight = isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black';

  return (
    <div className="relative flex items-center gap-3">
      {/* Suggestions open upward: the action bar is pinned to the bottom edge. */}
      {suggestions.length > 0 && (
        <ul
          className={`absolute bottom-full left-0 mb-2 max-h-56 w-56 overflow-auto rounded-xl border py-1 shadow-lg backdrop-blur ${theme.navBg} ${theme.border}`}
        >
          {suggestions.map((tag, i) => (
            <li key={tag}>
              <button
                type="button"
                // mousedown (not click) so the suggestion commits before the
                // input's blur can tear the bar down.
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(tag);
                }}
                className={`block w-full px-4 py-1.5 text-left text-sm tracking-wide transition-colors duration-150 cursor-pointer ${
                  i === active ? highlight : `${theme.textPrimary}`
                }`}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
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
        className={`w-56 rounded-full border bg-transparent px-4 py-1.5 text-sm tracking-wide outline-none transition-colors duration-200 ${theme.border} ${theme.textPrimary}`}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => commit(value)}
        disabled={!canSubmit}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-default ${theme.textPrimary} ${theme.textHover}`}
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
  );
}
