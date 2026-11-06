/**
 * Locate a phrase in the token stream produced by `tokenizeReadingText`.
 * Comparison is case-insensitive and ignores terminal punctuation, so
 * "54%" matches the token "54%," and ".tex" matches ".tex.".
 */
export interface ReadingKeyword {
  /** The phrase as it appears in the copy. */
  phrase: string;
  /** Display index, e.g. "01". Also the pairing key with the figure notes. */
  index: string;
  /** What the visual selects when this keyword is reached. */
  emphasis: string;
  /** The figure that carries the caption statement, e.g. "54%". */
  noteLead: string;
  /** The rest of the caption statement, e.g. "of the archive are documents". */
  noteText: string;
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.,;:!?%—–]/g, '')
    .trim();

export function findPhraseRange(tokens: string[], phrase: string) {
  const words = phrase.split(/\s+/).map(normalise);
  if (words.length === 0) return undefined;

  for (let start = 0; start <= tokens.length - words.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < words.length; offset += 1) {
      if (normalise(tokens[start + offset]) !== words[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return { start, end: start + words.length - 1 };
  }
  return undefined;
}
