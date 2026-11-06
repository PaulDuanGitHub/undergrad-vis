'use client';

import type { ReactNode } from 'react';
import { ActOpener } from '@/components/detail/narrative/ReportType';
import PinnedReading from '@/components/detail/narrative/PinnedReading';
import { ACT3_STEPS } from './act3Steps';

/**
 * Phone copy. The desktop story is `ACT3_STEPS` read through the pinned
 * reader; the phone keeps one step per screen with the numbers bolded.
 */
export const ACT3SUBSTEPS: { step: number; text: ReactNode; note?: string }[] = [
  {
    step: 0,
    text:
      <>
        <p>
          Freshman year: each track is an assignment with more than <b>100</b> versions,
          and each bubble is a burst of file saves. Notice how the bubbles cluster at
          the right edge — the deadline. <b>61%</b> of all edits happen within the last{' '}
          <b>12</b> hours, and <b>22%</b> with <b>12–24</b> hours left. The classic
          pattern of a beginner:
        </p>
        <p className="t-pull">
          <b>all panic, no pacing</b>.
        </p>
      </>,
    note: 'Hover a band to read its share; click to pin it.',
  },
  {
    step: 1,
    text:
      <>
        Four years later: the last year. The courses are harder — machine learning, NLP
        — and the projects are larger. But look at the bubble distribution. The right
        edge still dominates. The tools improved; the habits didn’t. <b>37%</b> of all
        edits happened within the last <b>12</b> hours.
      </>,
  },
  {
    step: 2,
    text:
      <>
        Now all <b>59</b> major assignments compress into a single dense grid. Five years,
        near <b>24,000</b> commits, squeezed into one view. I am, and apparently always
        have been, a deadline-driven student. <b>54%</b> of all edits were made within the
        last <b>12</b> hours. <b>73%</b> within the last <b>2</b> days.
      </>,
  },
  {
    step: 3,
    text:
      <>
        When exactly does the work happen? This heatmap maps <b>~43,000</b> file edits
        across days of the week and hours of the day. Weekend evenings burn brightest.{' '}
        <b>8pm</b>, the undisputed peak of productivity. Weekends are not spared: a full
        third of all edits happen on <b>Saturday and Sunday</b>. Mornings, by contrast,
        are almost wasted.
      </>,
    note: 'Tap a cell to read that hour’s file count.',
  },
];

export default function Act3Narrative() {
  return (
    <>
      <ActOpener act={3} />
      {ACT3_STEPS.map((step, index) => (
        <PinnedReading
          key={step.fig}
          act={3}
          step={index}
          text={step.text}
          keywords={step.keywords}
          note={step.note}
        />
      ))}
    </>
  );
}
