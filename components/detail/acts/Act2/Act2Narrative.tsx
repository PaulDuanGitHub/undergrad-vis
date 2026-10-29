'use client';

export const ACT2SUBSTEPS = [
  {
    step: 0,
    text: 
      <>
        Every file has a type, and every type tells a story.
        Here are the <b>sixteen</b> different file formats I've worked with across five years of coursework.
        From the digital paint of .kra to the rigorous proofs of .tex, each format is a lens into the skills and tools demanded by my education.
      </>
  },
  {
    step: 1,
    text: 
      <>
        Lines begin to weave between file types and the courses that demanded them.
        .java belongs to algorithms and data structures; .blend to art; .elm to functional front-end design.
        <p className="mt-2">
          Datawise, <b>.tex</b> is the most demanding, with <b>22</b> courses connecting to it.
          On the other end, the <b>NLP</b> course connected to <b>5</b> different file types.
        </p>
      </>
  },
  {
    step: 2,
    text: 
      <>
        Now the strips stretch into bars, ranked by sheer volume. 
        <p className="mt-2">
          <b>.tex</b> leads at <b>122</b> files, the backbone of every proof, every report and assignment. <b>.md</b> and <b>.docx</b> follow close behind.
        </p>
      </>
  },
  {
    step: 3,
    text: 
      <>
        But totals flatten time.
        Watch the bars melt into a flowing stream, semester by semester.
        Hovering or tapping the legend to reveal each stream.
      </>
  },
];

export default function Act2Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <h2 className="text-2xl py-100 mb-4 font-semibold">Act 2: The Strips</h2>
      {ACT2SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act2-step={s.step}
          className="act2-substep flex flex-col justify-center py-150"
        >
          <div className="text-sm lg:text-base">{s.text}</div>
        </div>
      ))}
      <div className="h-[50vh]"></div>
    </div>
  );
}
