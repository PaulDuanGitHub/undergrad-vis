"use client";

const SUBSTEPS = [
  {
    step: 0,
    text: "Every file has a type — and every type tells a story. Here are the sixteen different file formats I've worked with across five years of coursework. Hover over each badge to reveal what it means: from the digital paint of .kra to the mathematical precision of .hs.",
  },
  {
    step: 1,
    text: "Lines begin to weave between file types and the courses that demanded them. .java belongs to algorithms and data structures; .blend to 3D art; .elm to functional front-end design. Each thread is a requirement, a project, a grade.",
  },
  {
    step: 2,
    text: "Now the strips stretch into bars, ranked by sheer volume. .tex leads at 122 files — the backbone of every proof, every report, every thesis draft. .md and .docx follow close behind. The silhouette of my education, measured in file counts.",
  },
  {
    step: 3,
    text: "But totals flatten time. Watch the bars melt into a flowing stream, semester by semester. The .docx of freshman electives gradually recedes; the .tex tide rises with each passing year. This is not just a chart — it's the current of a mind learning what it wants to become.",
  },
];

export default function Act2Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <h2 className="text-2xl mb-4">Act 2: The Strips</h2>
      {SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act2-step={s.step}
          className="act2-substep flex flex-col justify-center py-100"
        >
          <p className="text-base">
            {s.text}
          </p>
        </div>
      ))}
    </div>
  );
}