/**
 * Split running copy into word-sized tokens, each carrying its trailing
 * whitespace. The reading head advances one token at a time, so a "space" is
 * the tick of the sweep; keeping the space attached means a highlighted token
 * is a continuous swatch rather than a gap and a word.
 */
export function tokenizeReadingText(text: string): string[] {
  return text.trim().match(/\S+\s*/g) ?? [];
}
