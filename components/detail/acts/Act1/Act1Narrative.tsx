'use client';

import type { ReactNode } from 'react';
import { ActOpener } from '@/components/detail/narrative/ReportType';
import PinnedReading from '@/components/detail/narrative/PinnedReading';
import { ACT1_STEPS } from './act1Opening';

/**
 * Phone copy. The desktop story is `ACT1_STEPS` rendered through the pinned
 * reader; the phone pane keeps a one-step-per-screen version of the same
 * sentences, with the keywords bolded instead of interactive.
 */
export const ACT1SUBSTEPS: { step: number; text: ReactNode; note?: string }[] = [
  {
    step: 0,
    text:
      <>
        Here lies every file I’ve created across five years: <b>567</b> workfiles, each one a cube.
        305 are documents — <b>54%</b> of the archive. 248 are code — <b>44%</b> of the files.
        14 are design — <b>2.5%</b> of the whole.
      </>,
    note: 'Hover or tap a cube to read its file, course and version count.',
  },
  {
    step: 1,
    text:
      <>
        The cubes reorganize by term: <b>eight semesters</b>, from <b>Fall 2021</b> to{' '}
        <b>Winter 2026</b> — 127 files in the first, 90 in the last.
      </>,
  },
  {
    step: 2,
    text:
      <>
        Color arrives: <b>34 courses</b>, compressed into five hues.
        Intro Comp Thinking holds <b>70 files</b>; NLP follows at <b>65</b>.
      </>,
  },
  {
    step: 3,
    text:
      <>
        Height becomes revision count. The tallest file holds <b>1,453 versions</b>;{' '}
        <b>half the archive</b> was revised 6 times or fewer; <b>five files</b> hold 11% of
        all versions.
      </>,
  },
  {
    step: 4,
    text:
      <>
        The cubes flatten into a calendar: one cell, one day. <b>Eight terms</b> share one
        surface; the brightest day is <b>April 12, 2022</b> — 19 files; <b>590 days</b> hold
        nothing.
      </>,
    note: 'Hover a cell to read the day and its file count.',
  },
];

export default function Act1Narrative() {
  return (
    <>
      <ActOpener act={1} />
      {ACT1_STEPS.map((step, index) => (
        <PinnedReading
          key={step.fig}
          act={1}
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
