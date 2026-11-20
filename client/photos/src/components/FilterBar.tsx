import type { Orientation } from '../lib/orientation';
import type { TagMode } from '../lib/filters';
import type { PhotosTheme } from '../types';

/** Solid rectangle/square glyphs for the three orientations. */
function OrientationGlyph({ orientation }: { orientation: Orientation }) {
  const rect =
    orientation === 'landscape'
      ? { x: 3, y: 6.5, width: 18, height: 11 }
      : orientation === 'portrait'
        ? { x: 6.5, y: 3, width: 11, height: 18 }
        : { x: 5, y: 5, width: 14, height: 14 };
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <rect {...rect} rx="1.5" fill="currentColor" />
    </svg>
  );
}

const ORIENTATIONS: { key: Orientation; label: string }[] = [
  { key: 'landscape', label: 'Landscape' },
  { key: 'portrait', label: 'Portrait' },
  { key: 'square', label: 'Square' },
];

interface FilterBarProps {
  tags: string[];
  tagModes: Record<string, TagMode>;
  onToggleTag: (tag: string) => void;
  orientations: ReadonlySet<Orientation>;
  onToggleOrientation: (orientation: Orientation) => void;
  theme: PhotosTheme;
  isDark: boolean;
}

/**
 * The gallery's filter controls: alphabetical tag pills on the left (wrapping
 * once they reach mid-screen) and the three orientation toggles on the right,
 * bottom-aligned so they sit level with the last row of tags. Tags are
 * tri-state (off / include / exclude). Only text, border and icon colours
 * change between states (no background fill), and all transitions fade. Include
 * is the highlight colour (inverted mono: black on light, white on dark);
 * exclude is light red; off is subtle with its border lifting on hover.
 */
export default function FilterBar({
  tags,
  tagModes,
  onToggleTag,
  orientations,
  onToggleOrientation,
  theme,
  isDark,
}: FilterBarProps) {
  // Highlight (inverted mono) and exclude (light red) colour sets. Pills carry a
  // transparent border at rest so the border can fade in without shifting layout.
  const highlightText = isDark ? 'text-white' : 'text-black';
  const includeColors = isDark ? 'border-white text-white' : 'border-black text-black';
  const excludeColors = isDark ? 'border-red-400/60 text-red-300' : 'border-red-400 text-red-600';
  const idleHover = isDark
    ? 'hover:border-white/40 hover:text-white'
    : 'hover:border-black/40 hover:text-black';
  const idleColors = `${theme.border} ${theme.textPrimary} ${idleHover}`;

  return (
    <div className="flex w-full items-end justify-between gap-6 pl-2 pr-2">
      {/* Tags: left, wrapping once they reach the middle of the screen. Given
          more room on narrow screens (50%), tightened to a third from sm up. */}
      <div className="flex max-w-[50%] flex-wrap gap-2.5 sm:max-w-[33%]">
        {tags.map((tag) => {
          const mode = tagModes[tag];
          const colors =
            mode === 'include' ? includeColors : mode === 'exclude' ? excludeColors : idleColors;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={mode === 'include'}
              title={
                mode === 'include'
                  ? `Only photos tagged “${tag}”`
                  : mode === 'exclude'
                    ? `Hiding photos tagged “${tag}”`
                    : `Filter by “${tag}”`
              }
              className={`px-4 py-1.5 rounded-full border text-sm tracking-wide font-medium transition-colors duration-300 cursor-pointer ${colors}`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Orientations: right, bottom-aligned with the last row of tags. */}
      <div className="flex shrink-0 items-center gap-2">
        {ORIENTATIONS.map(({ key, label }) => {
          const active = orientations.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleOrientation(key)}
              aria-pressed={active}
              aria-label={`${label} photos`}
              title={`${label} photos`}
              className={`p-2 rounded-md transition-colors duration-300 cursor-pointer ${
                active ? highlightText : `${theme.textSubtle} ${theme.textHover}`
              }`}
            >
              <OrientationGlyph orientation={key} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
