"use client";

const SUBSTEPS = [
  {
    step: 0,
    title: "The Overview",
    subtitle: "Every file, one point",
    text: "Here lies every single file I've created across five years of undergraduate research — each cube representing a document, a script, a paper, a presentation. At first glance, it's just a scattered grid. But there's a story waiting to be told.",
  },
  {
    step: 1,
    title: "Grouped by Semester",
    subtitle: "Eight terms, eight chapters",
    text: "Watch as the cubes reorganize themselves by academic term. Fall 2021 through Winter 2026 — eight semesters that shaped my research identity. Each term forms its own cluster, revealing the rhythm of academic life.",
  },
  {
    step: 2,
    title: "Color by Course",
    subtitle: "Five disciplines, five hues",
    text: "Now the cubes take on the colors of their courses. Green for computation, blue for mathematics, red for engineering — each discipline leaves its chromatic fingerprint on the canvas of my education.",
  },
  {
    step: 3,
    title: "Height = Versions",
    subtitle: "Taller means deeper",
    text: "The cubes rise from the plane — height now encodes version count. A tall tower marks a paper revised dozens of times; a short stub, a one-off script. This is the topography of iteration.",
  },
  {
    step: 4,
    title: "Calendar Heatmap",
    subtitle: "Days that shaped me",
    text: "Finally, the cubes spread into a true calendar. Each cell is a day, its warmth showing how many files were born that day. Empty spaces are the gaps — weekends, holidays, the quiet days between bursts of creation.",
  },
];

export default function Act0Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <h1 className="text-4xl font-bold mb-2">Act 0: The Cube</h1>
      <p className="text-lg text-amber-900/60 italic mb-16">
        Five dimensions of my digital footprint, revealed one layer at a time
      </p>

      {SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act0-step={s.step}
          className="act0-substep h-screen flex flex-col justify-center py-8"
        >
          <span className="text-xs tracking-[0.3em] text-amber-900/40 uppercase mb-3">
            Step {s.step + 1} of 5
          </span>
          <h2 className="text-2xl font-bold mb-1">{s.title}</h2>
          <p className="text-sm text-amber-900/50 mb-4 italic">{s.subtitle}</p>
          <p className="text-base leading-relaxed text-amber-900/80 max-w-sm">
            {s.text}
          </p>
        </div>
      ))}

      {/* spacer so the last step can scroll to center */}
      <div className="h-[50vh]" />
    </div>
  );
}