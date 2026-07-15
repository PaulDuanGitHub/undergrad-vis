"use client";

const SUBSTEPS = [
  {
    step: 0,
    text: "Here lies every single workfile I've created across five years of undergraduate courses. Each cube representing an assignment, a report, a piece of code. Hovering on the cube to take a glance.",
  },
  {
    step: 1,
    text: "Watch as the cubes reorganize themselves by academic term. Fall 2021 through Winter 2026 — eight semesters",
  },
  {
    step: 2,
    text: "Now the cubes take on the colors of their courses.",
  },
  {
    step: 3,
    text: "The cubes rise from the plane — height now encodes version count. A tall tower marks a paper revised dozens of times; a short stub, a one-off script. This is the topography of iteration.",
  },
  {
    step: 4,
    text: "Finally, the cubes spread into a true calendar. Each cell is a day, its warmth showing how many files were born that day. Empty spaces are the gaps — weekends, holidays, the quiet days between bursts of creation.",
  },
];

export default function Act1Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <p className="text-base mt-20 mb-100">
        An undergraduate degree isn't just awarded; it is built, block by block, in the quiet moments of focus and the chaotic hours of deadlines. <b>Have you ever wondered what the actual architecture of your time looks like?</b> Here is five years of my academic life, translated into data, geometry, and color.
      </p>

      <h2 className="text-2xl mb-4 font-semibold">Act 1: The Cubes</h2>
      {SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act1-step={s.step}
          className="act1-substep flex flex-col justify-center py-100"
        >
          <p className="text-base">
            {s.text}
          </p>
        </div>
      ))}
    </div>
  );
}