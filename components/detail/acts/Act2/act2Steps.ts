import type { ReadingKeyword } from '@/components/detail/narrative/keywordRange';

/**
 * Act II's four substeps, as plain data.
 *
 * `emphasis` is a format key (`format:.tex`) or a course (`course:NLP`); the
 * visual maps either to the same highlight/fade state that its pointer hover
 * already uses. `all` clears the filter. The copy and the figure captions
 * share this entry so their counts and indices cannot drift.
 */
export interface Act2Step {
  text: string;
  keywords: ReadingKeyword[];
  note?: string;
  fig: string;
  title: string;
}

export const ACT2_STEPS: Act2Step[] = [
  {
    fig: '06',
    title: 'Sixteen formats',
    text: 'Every file has a type, and every type tells a story. Here are the sixteen different file formats I’ve worked with across five years of coursework. From the digital paint of .kra to the rigorous proofs of .tex, each format is a lens into the skills and tools demanded by my education.',
    keywords: [
      {
        phrase: 'sixteen',
        index: '01',
        emphasis: 'all',
        noteLead: '16',
        noteText: 'file formats in the archive',
      },
      {
        phrase: '.kra',
        index: '02',
        emphasis: 'format:.kra',
        noteLead: '12',
        noteText: 'files of .kra',
      },
      {
        phrase: '.tex',
        index: '03',
        emphasis: 'format:.tex',
        noteLead: '122',
        noteText: 'files of .tex',
      },
    ],
  },
  {
    fig: '07',
    title: 'Formats × courses',
    text: 'Lines begin to weave between file types and the courses that demanded them. .java belongs to algorithms and data structures; .blend to art. By volume, .tex is the most demanding, with 22 courses; .elm to functional front-end design; NLP connected to 6 different file types.',
    note: 'Hover a ribbon to trace one format through its courses.',
    keywords: [
      {
        phrase: '.tex',
        index: '01',
        emphasis: 'format:.tex',
        noteLead: '22',
        noteText: 'courses connect to .tex',
      },
      {
        phrase: '.elm',
        index: '02',
        emphasis: 'format:.elm',
        noteLead: '18',
        noteText: 'files of .elm',
      },
      {
        phrase: 'NLP',
        index: '03',
        emphasis: 'course:NLP',
        noteLead: '6',
        noteText: 'formats in NLP',
      },
    ],
  },
  {
    fig: '08',
    title: 'Volume by format',
    text: 'Now the strips stretch into bars, ranked by sheer volume. .tex leads at 122 files, the backbone of every proof, every report and assignment. .md and .docx follow at 72 and 66.',
    keywords: [
      {
        phrase: '.tex',
        index: '01',
        emphasis: 'format:.tex',
        noteLead: '122',
        noteText: 'files of .tex',
      },
      {
        phrase: '.md',
        index: '02',
        emphasis: 'format:.md',
        noteLead: '72',
        noteText: 'files of .md',
      },
      {
        phrase: '.docx',
        index: '03',
        emphasis: 'format:.docx',
        noteLead: '66',
        noteText: 'files of .docx',
      },
    ],
  },
  {
    fig: '09',
    title: 'Volume over time',
    text: 'But totals flatten time. Watch the bars melt into a flowing stream, semester by semester. .tex runs through the whole river; .elm arrives late and spikes; the river spans eight terms and ends at 90 files in Winter 2026.',
    note: 'Hover or tap a legend entry to isolate its stream.',
    keywords: [
      {
        phrase: '.tex',
        index: '01',
        emphasis: 'format:.tex',
        noteLead: '122',
        noteText: 'files of .tex across eight terms',
      },
      {
        phrase: '.elm',
        index: '02',
        emphasis: 'format:.elm',
        noteLead: '18',
        noteText: 'files of .elm',
      },
      {
        phrase: 'eight terms',
        index: '03',
        emphasis: 'all',
        noteLead: '8',
        noteText: 'terms on one river',
      },
    ],
  },
];
