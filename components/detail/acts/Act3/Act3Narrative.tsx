'use client';

const SUBSTEPS = [
  {
    step: 0,
    text: 'Freshman year, Fall 2021. Each track is an assignment, each bubble a burst of file saves. Notice how the bubbles cluster at the right edge — the deadline. Almost every commit happened in the final 24 hours. The classic pattern of a beginner: all panic, no pacing.',
  },
  {
    step: 1,
    text: "Four years later, Fall 2025. The courses are harder — advanced algorithms, system design, software architecture. The projects are larger. But look at the bubble distribution. The right edge still dominates. The tools improved; the habits didn't.",
  },
  {
    step: 2,
    text: "Now all 59 major assignments compress into a single dense grid. Five years, 24,000 commits, squeezed into one view. The pattern is no longer a suspicion — it's a signature. I am, and apparently always have been, a deadline-driven creature.",
  },
  {
    step: 3,
    text: 'When exactly does the work happen? This heatmap maps 43,000 file edits across days of the week and hours of the day. Sunday evenings burn brightest — 8pm, the undisputed peak of productivity. Even weekends are not spared: a full third of all edits happen on Saturday and Sunday. The architecture of my time, laid bare.',
  },
];

export default function Act3Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <h2 className="text-2xl mb-4 font-semibold">Act 3: The Bubbles</h2>
      {SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act3-step={s.step}
          className="act3-substep flex flex-col justify-center py-100"
        >
          <p className="text-sm lg:text-base">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
