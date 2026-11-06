/**
 * The ten read-progress mechanisms explored in the narrative lab.
 *
 * Kept in a plain module (no `'use client'`) so the lab route, the switcher and
 * the renderer can all share the same list. Adding a mechanism means adding an
 * entry here and a branch in `ReadingProgressText`'s painter.
 */

export type ReadingVariant =
  | 'bar'
  | 'block'
  | 'pre-block'
  | 'word-block'
  | 'marker'
  | 'line-marker'
  | 'underline'
  | 'rising'
  | 'reverse'
  | 'rising-current';

export interface ReadingVariantInfo {
  id: ReadingVariant;
  /** Display index, also the 1–6 keyboard shortcut. */
  index: string;
  /** Toolbar label. */
  short: string;
  /** Full name for the overview cards. */
  label: string;
  description: string;
}

export const READING_VARIANTS: readonly ReadingVariantInfo[] = [
  {
    id: 'bar',
    index: '01',
    short: 'Bar',
    label: 'Cursor',
    description:
      'A hairline caret steps word to word. Read copy stays at full ink; unread copy waits at 26%.',
  },
  {
    id: 'block',
    index: '02',
    short: 'Block',
    label: 'Block cursor',
    description:
      'The insert-mode cursor: the same word-by-word sweep, but a filled cell on the current glyph.',
  },
  {
    id: 'pre-block',
    index: '03',
    short: 'Pre',
    label: 'Pre-word block',
    description:
      'A solid block in the gap before the next word, so the glyph it is about to reach stays untouched.',
  },
  {
    id: 'word-block',
    index: '04',
    short: 'Word',
    label: 'Word block',
    description:
      'The block widened to the whole current word: one solid cell turns the word over instead of a single glyph.',
  },
  {
    id: 'marker',
    index: '05',
    short: 'Marker',
    label: 'Highlighter',
    description:
      'A marker stroke paints the copy word by word, finishing each line before it climbs to the next.',
  },
  {
    id: 'line-marker',
    index: '06',
    short: 'Line',
    label: 'Line highlighter',
    description:
      'The same marker, quantised to whole lines: a line turns over complete as the sweep reaches it.',
  },
  {
    id: 'underline',
    index: '07',
    short: 'Rule',
    label: 'Underline',
    description:
      'A drawn rule follows the sweep, growing along the current line and holding under the read ones.',
  },
  {
    id: 'rising',
    index: '08',
    short: 'Rise',
    label: 'Rising band',
    description:
      'A kraft band climbs into the lower half of the type, as under “Productivity” on the landing page.',
  },
  {
    id: 'reverse',
    index: '09',
    short: 'Rev',
    label: 'Reverse kraft',
    description:
      'Read copy sits in a deep-kraft band and reverses to white; the current word is a red band.',
  },
  {
    id: 'rising-current',
    index: '10',
    short: 'Rise+',
    label: 'Rising + current',
    description:
      'The lower-half kraft band for read copy, with the current word in a coral rising band; the type stays dark.',
  },
] as const;

/** Variants that fade unread copy and carry a moving caret. */
export function isCursorVariant(variant: ReadingVariant): boolean {
  return (
    variant === 'bar' ||
    variant === 'block' ||
    variant === 'pre-block' ||
    variant === 'word-block'
  );
}

export function isReadingVariant(value: unknown): value is ReadingVariant {
  return READING_VARIANTS.some((variant) => variant.id === value);
}

/**
 * Split running copy into word-sized tokens, each carrying its trailing
 * whitespace. The cursor advances one token at a time, so a “space” is the
 * tick of the sweep; keeping the space attached means a highlighted token is
 * a continuous swatch rather than a gap and a word.
 */
export function tokenizeReadingText(text: string): string[] {
  return text.trim().match(/\S+\s*/g) ?? [];
}
