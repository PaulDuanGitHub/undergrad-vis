'use client';

export const ACT3SUBSTEPS = [
  {
    step: 0,
    text: 
      <>
        Freshman year, each track is an assignment that total file versions are over <b>100</b>, each bubble a burst of file saves.
        Notice how the bubbles cluster at the right edge the deadline.
        <b>~61%</b> of all edits happen within the last <b>12</b> hours and <b>~22%</b> when there are <b>12-24</b> hours left.
        The classic pattern of a beginner: 
        <p className='mt-6'>
          <b>all panic, no pacing</b>.
        </p>
      </>
  },
  {
    step: 1,
    text: 
      <>
        Four years later, the last year.
        The courses are harder, machine learning, NLP, the projects are larger.
        But look at the bubble distribution.
        The right edge still dominates. The tools improved; the habits didn't.
        <b>~37%</b> of all edits happened within the last <b>12</b> hours.
      </>
  },
  {
    step: 2,
    text: 
      <>
        Now all 59 major assignments compress into a single dense grid.
        Five years, near <b>24,000</b> commits, squeezed into one view.
        I am, and apparently always have been, a deadline-driven student.
        <p className='mt-6'>
        <b>~54%</b> of all edits were made within the last <b>12</b> hours. <b>~73%</b> within the last <b>2</b> days.
        </p>
      </>
  },
  {
    step: 3,
    text: 
      <>
        When exactly does the work happen?
        This heatmap maps <b>~43,000</b> file edits across days of the week and hours of the day.
        Sunday evenings burn brightest. <b>8pm</b>, the undisputed peak of productivity.
        Weekends are not spared: a full third of all edits happen on Saturday and Sunday.
        In the contrast, morning time are almost wasted.
      </>
  },
];

export default function Act3Narrative() {
  return (
    <div className="flex flex-col items-start w-full">
      <h2 className="text-2xl mb-4 font-semibold">Act 3: The Bubbles</h2>
      {ACT3SUBSTEPS.map((s) => (
        <div
          key={s.step}
          data-act3-step={s.step}
          className="act3-substep flex flex-col justify-center py-100"
        >
          <div className="text-sm lg:text-base">{s.text}</div>
        </div>
      ))}
    </div>
  );
}
