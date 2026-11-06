import type { ReadingKeyword } from '@/components/detail/narrative/keywordRange';

/**
 * Act III's four substeps.
 *
 * `emphasis` is `band:<days>` for a cumulative deadline window, or
 * `punch:evening` / `punch:weekend` for the punchcard. `all` clears the focus;
 * some keywords carry a note without a filter because their number is a slice
 * of a band rather than a band's cumulative edge.
 */
export interface Act3Step {
  text: string;
  keywords: ReadingKeyword[];
  note?: string;
  fig: string;
  title: string;
}

export const ACT3_STEPS: Act3Step[] = [
  {
    fig: '10',
    title: 'Freshman year',
    text: 'Freshman year: each track is an assignment with more than 100 versions, and each bubble is a burst of file saves. Notice how the bubbles cluster at the right edge — the deadline. 61% of all edits happen within the last 12 hours, and 22% with 12–24 hours left. The classic pattern of a beginner: all panic, no pacing.',
    note: 'Hover a band to read its share; click to pin it.',
    keywords: [
      {
        phrase: '100',
        index: '01',
        emphasis: 'all',
        noteLead: '100+',
        noteText: 'versions in one assignment',
      },
      {
        phrase: '61%',
        index: '02',
        emphasis: 'band:0.5',
        noteLead: '61%',
        noteText: 'of edits in the last 12 hours',
      },
      {
        phrase: '22%',
        index: '03',
        emphasis: 'all',
        noteLead: '22%',
        noteText: 'of edits in the 12–24 hour window',
      },
    ],
  },
  {
    fig: '11',
    title: 'The last year',
    text: 'Four years later: the last year. The courses are harder — machine learning, NLP — and the projects are larger. But look at the bubble distribution. The right edge still dominates. The tools improved; the habits didn’t. 37% of all edits happened within the last 12 hours.',
    keywords: [
      {
        phrase: 'last year',
        index: '01',
        emphasis: 'all',
        noteLead: '2',
        noteText: 'terms in the final year',
      },
      {
        phrase: '37%',
        index: '02',
        emphasis: 'band:0.5',
        noteLead: '37%',
        noteText: 'of edits in the last 12 hours',
      },
    ],
  },
  {
    fig: '12',
    title: 'All assignments',
    text: 'Now all 59 major assignments compress into a single dense grid. Five years, near 24,000 commits, squeezed into one view. I am, and apparently always have been, a deadline-driven student. 54% of all edits were made within the last 12 hours. 73% within the last 2 days.',
    keywords: [
      {
        phrase: '59',
        index: '01',
        emphasis: 'all',
        noteLead: '59',
        noteText: 'major assignments',
      },
      {
        phrase: '54%',
        index: '02',
        emphasis: 'band:0.5',
        noteLead: '54%',
        noteText: 'of edits in the last 12 hours',
      },
      {
        phrase: '73%',
        index: '03',
        emphasis: 'band:2',
        noteLead: '73%',
        noteText: 'of edits in the last two days',
      },
    ],
  },
  {
    fig: '13',
    title: 'The week',
    text: 'When exactly does the work happen? This heatmap maps ~43,000 file edits across days of the week and hours of the day. Weekend evenings burn brightest. 8pm, the undisputed peak of productivity. Weekends are not spared: a full third of all edits happen on Saturday and Sunday. Mornings, by contrast, are almost wasted.',
    note: 'Tap a cell to read that hour’s file count.',
    keywords: [
      {
        phrase: '43,000',
        index: '01',
        emphasis: 'all',
        noteLead: '43,000',
        noteText: 'file edits',
      },
      {
        phrase: '8pm',
        index: '02',
        emphasis: 'punch:8pm',
        noteLead: '8pm',
        noteText: 'the peak hour',
      },
      {
        phrase: 'Saturday and Sunday',
        index: '03',
        emphasis: 'punch:weekend',
        noteLead: '33%',
        noteText: 'of edits on weekends',
      },
    ],
  },
];
