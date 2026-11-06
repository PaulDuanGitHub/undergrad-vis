import type { ReadingKeyword } from '@/components/detail/narrative/keywordRange';

/**
 * Act I's five substeps, as plain data.
 *
 * The pinned reader and the figure caption read the same entry, so the copy,
 * the keyword indices, the emphasis values and the notes cannot drift apart.
 * `emphasis` is interpreted by Act1Visual:
 *
 *   all | term:<term> | course:<course> | versions:top | versions:low |
 *   versions:top5 | day:peak | day:empty | document | code | design
 */
export interface Act1Step {
  text: string;
  keywords: ReadingKeyword[];
  /** Interaction note under the copy; omitted when the step has none. */
  note?: string;
  /** Plate number and figure title for the report chrome. */
  fig: string;
  title: string;
}

export const ACT1_STEPS: Act1Step[] = [
  {
    fig: '01',
    title: '567 files, one cube each',
    text: 'Here lies every file I’ve created across five years: 567 workfiles, each one a cube. 305 are documents — 54% of the archive. 248 are code — 44% of the files. 14 are design — 2.5% of the whole.',
    note: 'Hover or tap a cube to read its file, course and version count.',
    keywords: [
      {
        phrase: '54%',
        index: '01',
        emphasis: 'document',
        noteLead: '54%',
        noteText: 'of the archive are documents',
      },
      {
        phrase: '44%',
        index: '02',
        emphasis: 'code',
        noteLead: '44%',
        noteText: 'of the files are code',
      },
      {
        phrase: '2.5%',
        index: '03',
        emphasis: 'design',
        noteLead: '2.5%',
        noteText: 'are design',
      },
    ],
  },
  {
    fig: '02',
    title: 'Eight terms',
    text: 'The cubes reorganize by term: eight semesters, from Fall 2021 to Winter 2026 — 127 files in the first, 90 in the last.',
    keywords: [
      {
        phrase: 'eight semesters',
        index: '01',
        emphasis: 'all',
        noteLead: '8',
        noteText: 'terms in the record',
      },
      {
        phrase: 'Fall 2021',
        index: '02',
        emphasis: 'term:2021 Fall',
        noteLead: '127',
        noteText: 'files in Fall 2021',
      },
      {
        phrase: 'Winter 2026',
        index: '03',
        emphasis: 'term:2026 Winter',
        noteLead: '90',
        noteText: 'files in Winter 2026',
      },
    ],
  },
  {
    fig: '03',
    title: 'Thirty-four courses',
    text: 'Color arrives: 34 courses, compressed into five hues. Intro Comp Thinking holds 70 files; NLP follows at 65.',
    keywords: [
      {
        phrase: '34 courses',
        index: '01',
        emphasis: 'all',
        noteLead: '34',
        noteText: 'courses, five hues',
      },
      {
        phrase: '70 files',
        index: '02',
        emphasis: 'course:Intro Comp Thinking',
        noteLead: '70',
        noteText: 'files in Intro Comp Thinking',
      },
      {
        phrase: '65',
        index: '03',
        emphasis: 'course:NLP',
        noteLead: '65',
        noteText: 'files in NLP',
      },
    ],
  },
  {
    fig: '04',
    title: 'Height = revisions',
    text: 'Height becomes revision count. The tallest file holds 1,453 versions; half the archive was revised 6 times or fewer; five files hold 11% of all versions.',
    keywords: [
      {
        phrase: '1,453 versions',
        index: '01',
        emphasis: 'versions:top',
        noteLead: '1,453',
        noteText: 'versions in the tallest file',
      },
      {
        phrase: 'half the archive',
        index: '02',
        emphasis: 'versions:low',
        noteLead: '51%',
        noteText: 'of files have six versions or fewer',
      },
      {
        phrase: 'five files',
        index: '03',
        emphasis: 'versions:top5',
        noteLead: '5',
        noteText: 'files hold 11% of all versions',
      },
    ],
  },
  {
    fig: '05',
    title: 'The calendar',
    text: 'The cubes flatten into a calendar: one cell, one day. Eight terms share one surface; the brightest day is April 12, 2022 — 19 files; 590 days hold nothing.',
    note: 'Hover a cell to read the day and its file count.',
    keywords: [
      {
        phrase: 'Eight terms',
        index: '01',
        emphasis: 'all',
        noteLead: '8',
        noteText: 'terms on one surface',
      },
      {
        phrase: 'April 12, 2022',
        index: '02',
        emphasis: 'day:peak',
        noteLead: '19',
        noteText: 'files on April 12, 2022',
      },
      {
        phrase: '590 days',
        index: '03',
        emphasis: 'day:empty',
        noteLead: '590',
        noteText: 'days with no saves',
      },
    ],
  },
];
