'use client';

const SUBSTEPS = [
  {
    step: 0,
    text: "Here lies every single workfile I've created across five years of undergraduate courses. Each cube representing an assignment, a report, a piece of code. Hovering on the cube to take a glance.",
  },
  {
    step: 1,
    text: 'Watch as the cubes reorganize themselves by academic term. Fall 2021 through Winter 2026 — eight semesters of work, clustered into their temporal homes.',
  },
  {
    step: 2,
    text: 'Now the cubes take on the colors of their courses. Five disciplines, five hues — the intellectual palette of an undergraduate education.',
  },
  {
    step: 3,
    text: 'The cubes rise from the plane — height now encodes version count. A tall tower marks a paper revised dozens of times; a short stub, a one-off script. This is the topography of iteration.',
  },
  {
    step: 4,
    text: 'Finally, the cubes spread into a true calendar. Each cell is a day, its warmth showing how many files were born that day. Empty spaces are the gaps — weekends, holidays, the quiet days between bursts of creation.',
  },
];

export default function Act1NarrativeMd({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-start w-full pt-2">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">
        Act 1: The Cubes
      </h2>
      {SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <p
          key={s.step}
          className="text-sm leading-relaxed text-slate-700"
        >
          {s.text}
        </p>
      ))}
    </div>
  );
}
