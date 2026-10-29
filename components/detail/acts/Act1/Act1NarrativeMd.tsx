'use client';
import { ACT1SUBSTEPS } from './Act1Narrative';

export default function Act1NarrativeMd({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-start w-full pt-2">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">
        Act 1: The Cubes
      </h2>
      {ACT1SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <div
          key={s.step}
          className="text-[15px] leading-relaxed text-slate-700"
        >
          {s.text}
        </div>
      ))}
    </div>
  );
}
