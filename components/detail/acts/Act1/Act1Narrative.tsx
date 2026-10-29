'use client';

export const ACT1SUBSTEPS = [
  {
    step: 0,
    text:
      <>
        Here lies every single <b>workfile</b> I've created across five years of undergraduate courses.
        In total, there are <b>567</b> files, each one a cube in this 3D space.
        Each cube representing an assignment, a report, a piece of code. Hovering or tapping a cube to take a glance.
      </>,
  },
  {
    step: 1,
    text: 
      <>
        Watch as the cubes reorganize themselves by academic term. Fall 2021 through Winter 2026, in total <b>8</b> semesters,
      </>
  },
  {
    step: 2,
    text: 
      <>
        Now the cubes take on the colors of their courses.
        Within this dataset, there are <b>34</b> distinct courses.
      </>
  },
  {
    step: 3,
    text: 
      <>
        The cubes rise from the plane. Height now encodes <b>version count</b>.
        A tall tower may mark an assignment revised dozens of times;
      </>
  },
  {
    step: 4,
    text: 
      <>
        Finally, the cubes spread into a true calendar. Each cell is a day, its warmth showing how many files were born that day. Empty spaces are the gaps, weekends, holidays, the quiet days between bursts of creation.
      </>
  },
];

export default function Act1Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <p className="text-sm lg:text-base mt-20 mb-100">
        An undergraduate degree isn't just awarded; it is built, block by block,
        in the quiet moments of focus and the chaotic hours of deadlines.{' '}
        <b>
          Have you ever wondered what the actual architecture of your time looks
          like?
        </b>{' '}
        Here is five years of my academic life, translated into data, geometry,
        and color.
      </p>

      <h2 className="text-2xl py-100 mb-4 font-semibold">Act 1: The Cubes</h2>
      {ACT1SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act1-step={s.step}
          className="act1-substep flex flex-col justify-center py-150"
        >
          <div className="text-sm lg:text-base">{s.text}</div>
        </div>
      ))}

      <div className="h-[50vh]"></div>
    </div>
  );
}
