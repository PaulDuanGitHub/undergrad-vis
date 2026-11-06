'use client';

import type { ReactNode } from 'react';
import { ActOpener } from '@/components/detail/narrative/ReportType';
import PinnedReading from '@/components/detail/narrative/PinnedReading';
import { ACT2_STEPS } from './act2Steps';

/**
 * Phone copy. The desktop story is `ACT2_STEPS` rendered through the pinned
 * reader; the phone pane keeps one step per screen with the keywords bolded.
 */
export const ACT2SUBSTEPS: { step: number; text: ReactNode; note?: string }[] = [
  {
    step: 0,
    text:
      <>
        Every file has a type, and every type tells a story. Here are the{' '}
        <b>sixteen</b> different file formats I’ve worked with across five years of
        coursework. From the digital paint of .kra to the rigorous proofs of .tex,
        each format is a lens into the skills and tools demanded by my education.
      </>,
  },
  {
    step: 1,
    text:
      <>
        Lines begin to weave between file types and the courses that demanded them.
        .java belongs to algorithms and data structures; .blend to art. By volume,{' '}
        <b>.tex</b> is the most demanding, with <b>22</b> courses; <b>.elm</b> to
        functional front-end design; <b>NLP</b> connected to <b>6</b> different file
        types.
      </>,
    note: 'Hover a ribbon to trace one format through its courses.',
  },
  {
    step: 2,
    text:
      <>
        Now the strips stretch into bars, ranked by sheer volume. <b>.tex</b> leads
        at <b>122</b> files, the backbone of every proof, every report and assignment.{' '}
        <b>.md</b> and <b>.docx</b> follow at <b>72</b> and <b>66</b>.
      </>,
  },
  {
    step: 3,
    text:
      <>
        But totals flatten time. Watch the bars melt into a flowing stream, semester
        by semester. <b>.tex</b> runs through the whole river; <b>.elm</b> arrives
        late and spikes; the river spans <b>eight terms</b> and ends at 90 files in
        Winter 2026.
      </>,
    note: 'Hover or tap a legend entry to isolate its stream.',
  },
];

export default function Act2Narrative() {
  return (
    <>
      <ActOpener act={2} />
      {ACT2_STEPS.map((step, index) => (
        <PinnedReading
          key={step.fig}
          act={2}
          step={index}
          text={step.text}
          keywords={step.keywords}
          note={step.note}
        />
      ))}
      <div className="h-[50vh]" />
    </>
  );
}
